import { readFileSync, statSync, readdirSync } from 'fs'
import { join } from 'path'

function walk(dir) {
  let results = []
  const list = readdirSync(dir)
  for (const file of list) {
    const fileDir = join(dir, file)
    const stat = statSync(fileDir)
    if (stat && stat.isDirectory() && file !== 'node_modules') {
      results = results.concat(walk(fileDir))
    } else {
      if (file === 'index.ts' || file === 'index.tsx') {
        results.push(fileDir)
      }
    }
  }
  return results
}

const indexes = walk('D:\\LAST\\src')

for (const p of indexes) {
  const c = readFileSync(p, 'utf8')
  const hasExportStar = c.includes('export *')
  const hasNonTypeExport = /export \{/.test(c) && !/export type \{/.test(c)
  const hasDefaultExport = c.includes('export default')
  console.log(`[INDEX] ${p}`)
  console.log(`  export *: ${hasExportStar}`)
  console.log(`  hasNonTypeExport: ${hasNonTypeExport}`)
  console.log(`  hasDefaultExport: ${hasDefaultExport}`)
}
