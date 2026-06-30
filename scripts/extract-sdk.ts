const src = await Deno.readTextFile('./electron/ipc/dist/*')

// API routes — strings matching sdk: prefix or /v1alpha patterns
const channels = [...new Set([
  ...[...src.matchAll(/['"`](sdk:[a-zA-Z0-9_.:\-]+)['"`]/g)].map(m => m[1]),
])]

// HTTP endpoints
const endpoints = [...new Set([
  ...[...src.matchAll(/['"`](\/v\w+\/[a-zA-Z0-9/_{}:*-]+)['"`]/g)].map(m => m[1]),
])]

// Zod schemas — z.object / z.string etc named assignments
const schemas = [...new Set([
  ...[...src.matchAll(/const\s+(\w+)\s*=\s*z\s*\.\s*(?:object|string|number|array|enum|union|literal)/g)].map(m => m[1]),
])]

// Public class/method names
const classes = [...new Set([
  ...[...src.matchAll(/class\s+(\w+)/g)].map(m => m[1]),
])]

const methods = [...new Set([
  ...[...src.matchAll(/async\s+(\w+)\s*\(/g)].map(m => m[1]),
])]

const out = {
  ipcChannels: channels.sort(),
  httpEndpoints: endpoints.sort(),
  zodSchemas: schemas.sort(),
  classes: classes.sort(),
  asyncMethods: methods.sort(),
}

await Deno.writeTextFile('./research/sdk-extract.json', JSON.stringify(out, null, 2))
console.log(`channels: ${channels.length}, endpoints: ${endpoints.length}, schemas: ${schemas.length}, classes: ${classes.length}, methods: ${methods.length}`)
console.log('written → research/sdk-extract.json')
