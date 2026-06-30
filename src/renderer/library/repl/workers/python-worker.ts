import type {PyodideInterface} from 'pyodide'
import {loadPyodide} from 'pyodide'
import {expose} from 'comlink'

let pyodide: PyodideInterface | null = null

type PyFn = (...args: unknown[]) => unknown

interface PyFut {
    syntax_check: string
    formatted_error?: string
    destroy: () => void
}

interface PyConsole {
    stdout_callback: (msg: string) => void
    push: (line: string) => PyFut
    buffer: string[]
}

let pythonConsole: {
    awaitFut: PyFn
    getCompletions: PyFn
    pyconsole: PyConsole
} | null = null

const python = {
    async init(
        stdout: (msg: string) => void,
        onLoad: ({id, version, banner}: { id: string; version: string; banner?: string }) => void,
        mode: 'standard' | 'console',
        packages?: string[][]
    ) {
        console.info('[repl] worker: loading pyodide…')
        pyodide = await loadPyodide({indexURL: '/pyodide/', stdout})
        console.info('[repl] worker: pyodide', pyodide.version, 'loaded')

        const official = packages?.[0]
        const micropip = packages?.[1]

        if (official && official.length > 0) {
            console.info('[repl] worker: loading packages', official)
            await pyodide.loadPackage(official)
        }
        if (micropip && micropip.length > 0) {
            await pyodide.loadPackage(['micropip'])
            const mp = pyodide.pyimport('micropip') as any
            await mp.install(micropip)
        }

        const id = crypto.randomUUID()
        const version = pyodide.version
        console.info('[repl] worker: ready', {id, version, mode})

        await pyodide.runPythonAsync(`
import sys
sys.tracebacklimit = 0
`)

        if (mode === 'console') {
            const namespace = pyodide.runPython('dict()')
            await pyodide.runPythonAsync(`
import sys
from pyodide.ffi import to_js
from pyodide.console import PyodideConsole, repr_shorten, BANNER
import __main__
BANNER = "Welcome to the Pyodide terminal emulator 🐍\\n" + BANNER
pyconsole = PyodideConsole(__main__.__dict__)
import builtins
import rlcompleter
_completer = rlcompleter.Completer(__main__.__dict__)
def get_completions(text):
  results = []
  state = 0
  while True:
    res = _completer.complete(text, state)
    if res is None:
      break
    results.append(res)
    state += 1
  return to_js(results)
async def await_fut(fut):
  res = await fut
  if res is not None:
    builtins._ = res
  return to_js([res], depth=1)
def clear_console():
  pyconsole.buffer = []
import os
def _ls(path='.'):
  try:
    for item in sorted(os.listdir(path)):
      full = os.path.join(path, item)
      if os.path.isdir(full):
        print(f"📁 {item}/")
      else:
        print(f"📄 {item} ({os.path.getsize(full)} bytes)")
  except Exception as e:
    print(f"Error: {e}")
def _cat(path):
  try:
    with open(path, 'r', encoding='utf-8') as f:
      print(f.read())
  except Exception as e:
    print(f"Error: {e}")
def _write(path, text):
  try:
    with open(path, 'w', encoding='utf-8') as f:
      f.write(text)
    print(f"Wrote {len(text)} chars to {path}")
  except Exception as e:
    print(f"Error: {e}")
builtins.ls = _ls
builtins.cat = _cat
builtins.pwd = os.getcwd
builtins.write = _write
`, {globals: namespace})

            const namespaceTyped = namespace as any
            const pyconsole = namespaceTyped.get('pyconsole') as unknown as PyConsole
            pyconsole.stdout_callback = stdout

            pythonConsole = {
                awaitFut: namespaceTyped.get('await_fut') as unknown as PyFn,
                getCompletions: namespaceTyped.get('get_completions') as unknown as PyFn,
                pyconsole,
            }

            const banner = namespaceTyped.get('BANNER') as unknown as string
            onLoad({id, version, banner})
        } else {
            onLoad({id, version})
        }
    },

    async run(code: string, autoImportPackages: boolean): Promise<{ state: string; error?: string } | undefined> {
        if (!pyodide) throw new Error('Pyodide not initialised')

        if (autoImportPackages) {
            await pyodide.loadPackagesFromImports(code)
        }

        if (pythonConsole) {
            let state: string | undefined
            for (const line of code.split('\n')) {
                const fut = pythonConsole.pyconsole.push(line)
                state = fut.syntax_check
                const wrapped = pythonConsole.awaitFut(fut) as any
                try {
                    const [value] = await wrapped
                    if (value instanceof pyodide.ffi.PyProxy) {
                        value.destroy()
                    }
                } catch (error: unknown) {
                    if (error instanceof Error && error.constructor.name === 'PythonError') {
                        const message = fut.formatted_error ?? error.message
                        return {state: state ?? 'complete', error: message.trimEnd()}
                    }
                    throw error
                } finally {
                    fut.destroy()
                    if (wrapped && typeof wrapped.destroy === 'function') {
                        wrapped.destroy()
                    }
                }
            }
            return {state: state ?? 'complete'}
        } else {
            await pyodide.runPythonAsync(code)
            return {state: 'complete'}
        }
    },

    readFile(name: string): string {
        if (!pyodide) throw new Error('Pyodide not initialised')
        return pyodide.FS.readFile(name, {encoding: 'utf8'})
    },

    writeFile(name: string, data: string): void {
        if (!pyodide) throw new Error('Pyodide not initialised')
        pyodide.FS.writeFile(name, data, {encoding: 'utf8'})
    },

    mkdir(name: string): void {
        if (!pyodide) throw new Error('Pyodide not initialised')
        pyodide.FS.mkdir(name)
    },

    rmdir(name: string): void {
        if (!pyodide) throw new Error('Pyodide not initialised')
        pyodide.FS.rmdir(name)
    },

    getCompletions(text: string): string[] {
        if (!pythonConsole) return []
        return pythonConsole.getCompletions(text) as string[]
    },
}

expose(python)
