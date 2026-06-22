import { getAllSchemas } from '@google/jules-sdk'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { writeFileSync } from 'node:fs'

const schemas = getAllSchemas()
const out: string[] = ['// auto-generated from @google/jules-sdk Zod schemas', '']

for (const [name, schema] of Object.entries(schemas)) {
    const json = zodToJsonSchema(schema as Parameters<typeof zodToJsonSchema>[0], {
        name,
        target: 'jsonSchema7',
    })
    out.push(`// ${name}`)
    out.push(JSON.stringify(json, null, 2))
    out.push('')
}

const dest = 'scripts/sdk-schemas.json'
writeFileSync(dest, JSON.stringify(
    Object.fromEntries(
        Object.entries(schemas).map(([k, v]) => [
            k,
            zodToJsonSchema(v as Parameters<typeof zodToJsonSchema>[0], { target: 'jsonSchema7' })
        ])
    ),
    null, 2
))

console.log(`written → ${dest}`)
console.log('schemas:', Object.keys(schemas).join(', '))
