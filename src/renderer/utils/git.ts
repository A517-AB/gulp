export const GIT_COLORS: Record<string, string> = {
  M: 'text-yellow-400', A: 'text-green-400',
  D: 'text-red-400', '?': 'text-cyan-400/80', U: 'text-red-500',
}

export const normalizePath = (p: string) => p.replace(/\\/g, '/')

export interface GitChange {
  path: string
  code: string
}

export function parseGitStatusPorcelain(stdout: string): GitChange[] {
  return stdout
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const xy = line.slice(0, 2)
      const filePart = line.slice(3).trim()
      const path = filePart.includes(' -> ') ? (filePart.split(' -> ')[1] ?? filePart) : filePart
      let code = '?'
      if (xy === '??') code = '?'
      else if (xy.includes('U') || xy === 'AA' || xy === 'DD') code = 'U'
      else if (xy.startsWith('D') || xy.endsWith('D')) code = 'D'
      else if (xy.startsWith('A') || xy.endsWith('A')) code = 'A'
      else if (xy.startsWith('M') || xy.endsWith('M') || xy.startsWith('R')) code = 'M'
      return { path, code }
    })
}
