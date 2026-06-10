/**
 * Monaco Editor — local worker setup for Vite.
 *
 * Importing this module configures @monaco-editor/loader to use the
 * locally-installed monaco-editor package instead of fetching from CDN.
 * Web-workers are inlined via Vite's `?worker` import syntax so the
 * editor works fully offline (important for Electron).
 *
 * Import this module ONCE, early — e.g. in main.tsx before React mounts.
 */

import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

loader.config({ monaco })

// ── TypeScript / JavaScript compiler options ───────────────────────────────

const sharedCompilerOptions: monaco.languages.typescript.CompilerOptions = {
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.Bundler,
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  strict: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
  allowImportingTsExtensions: true,
  lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
}

const tsDefaults = monaco.languages.typescript.typescriptDefaults
const jsDefaults = monaco.languages.typescript.javascriptDefaults

tsDefaults.setCompilerOptions(sharedCompilerOptions)
jsDefaults.setCompilerOptions({ ...sharedCompilerOptions, strict: false, exactOptionalPropertyTypes: false, noUncheckedIndexedAccess: false })

// Suppress module-resolution and implicit-global noise that fires in isolated snippet editors.
// Syntax and real type errors still surface.
const suppressedCodes = [
  2307, // Cannot find module 'X' or its corresponding type declarations
  2304, // Cannot find name 'X' (JSX, global env etc.)
  2580, // Cannot find name 'require'. Do you need to install @types/node?
  2686, // 'X' refers to UMD global
  1375, // 'await' expressions are only allowed at the top level
  1378, // Top-level 'await' expressions are only allowed when the module option is set to 'es2022'
]
tsDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false, diagnosticCodesToIgnore: suppressedCodes })
jsDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false, diagnosticCodesToIgnore: suppressedCodes })

// Eager worker init so the first editor open doesn't wait
tsDefaults.setEagerModelSync(true)
jsDefaults.setEagerModelSync(true)
