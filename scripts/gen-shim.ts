#!/usr/bin/env bun
// Usage: bun scripts/gen-shim.ts <package-name> <output-path>
// Example: bun scripts/gen-shim.ts @google/jules-sdk src/jules/sdk.ts
//
// Reads every .d.ts the package exports, classifies each symbol as value or
// type-only using the TS compiler, writes a typed re-export shim.
// Re-run whenever the package updates.

import ts from 'typescript'
import { resolve, dirname } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { createRequire } from 'module'

const [pkg, out] = process.argv.slice(2)
if (!pkg || !out) {
  console.error('Usage: bun scripts/gen-shim.ts <package-name> <output-path>')
  process.exit(1)
}

const require = createRequire(import.meta.url)

let pkgJsonPath: string
try {
  pkgJsonPath = require.resolve(`${pkg}/package.json`)
} catch {
  console.error(`Could not find package: ${pkg}`)
  process.exit(1)
}

const pkgJson   = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
const typesRel  = pkgJson.types ?? pkgJson.typings ?? 'index.d.ts'
const typesFile = resolve(dirname(pkgJsonPath), typesRel)

const program = ts.createProgram([typesFile], {
  allowJs:                false,
  declaration:            true,
  moduleResolution:       ts.ModuleResolutionKind.Bundler,
  module:                 ts.ModuleKind.ESNext,
  target:                 ts.ScriptTarget.ESNext,
  skipLibCheck:           true,
  noEmit:                 true,
})

const checker      = program.getTypeChecker()
const sourceFile   = program.getSourceFile(typesFile)
if (!sourceFile) { console.error(`Could not load ${typesFile}`); process.exit(1) }

const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
if (!moduleSymbol) { console.error('No module symbol found'); process.exit(1) }

const values: string[] = []
const types:  string[] = []

for (const exp of checker.getExportsOfModule(moduleSymbol)) {
  const name = exp.getName()

  // Re-exported symbols are aliases — follow them to get the real declaration flags.
  const resolved = exp.getFlags() & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(exp)
    : exp
  const flags = resolved.getFlags()

  // Classes and enums carry both Value and Type flags — treat as value exports.
  // Interfaces and type aliases carry only Type flags — export type.
  if (flags & ts.SymbolFlags.Value) {
    values.push(name)
  } else {
    types.push(name)
  }
}

values.sort()
types.sort()

const header = [
  `// Auto-generated shim for ${pkg}`,
  `// Re-run: bun scripts/gen-shim.ts ${pkg} ${out}`,
  `//`,
  `// Import everything ${pkg.split('/').pop()}-related from here.`,
  `// Never import directly from '${pkg}' in the app — one re-run keeps this current.`,
  ``,
].join('\n')

const valueBlock = values.length
  ? `export {\n${values.map(v => `  ${v},`).join('\n')}\n} from '${pkg}'`
  : ''

const typeBlock = types.length
  ? `export type {\n${types.map(t => `  ${t},`).join('\n')}\n} from '${pkg}'`
  : ''

const content = [header, valueBlock, typeBlock].filter(Boolean).join('\n\n') + '\n'

mkdirSync(dirname(resolve(out)), { recursive: true })
writeFileSync(out, content, 'utf-8')

console.log(`✓  ${values.length} values + ${types.length} types → ${out}`)
