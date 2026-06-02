import { Hono } from 'hono'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { z } from 'zod'
import { webcrypto } from 'node:crypto'

const uuid = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : webcrypto.randomUUID()

interface Session {
  ask(prompt: string): Promise<{ message: string }>
}

export type McpToolHandler = (args: unknown) => Promise<unknown>

export interface McpToolConfig {
  handler: McpToolHandler
  schema?: Record<string, z.ZodTypeAny>
}

export interface McpRemoteConfig {
  name: string
  version: string
  session?: () => Promise<Session>
  tools?: Record<string, McpToolHandler | McpToolConfig>
}

export function createMcpHandler(config: McpRemoteConfig) {
  const server = new McpServer({ name: config.name, version: config.version })

  if (config.session) {
    server.tool('interact', { prompt: z.string() }, async ({ prompt }) => {
      const session = await config.session!()
      const activity = await session.ask(prompt)
      return { content: [{ type: 'text' as const, text: activity.message }] }
    })
  }

  if (config.tools) {
    for (const [name, def] of Object.entries(config.tools)) {
      const handler = typeof def === 'function' ? def : def.handler
      const schema = typeof def === 'function' ? {} : (def.schema ?? {})

      server.tool(name, schema, async (args) => {
        const result = await handler(args)
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
      })
    }
  }

  const app = new Hono()
  const transports = new Map<string, SSEServerTransport>()

  app.get('/sse', (c) => {
    const sessionId = uuid()
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    const resMock = {
      writeHead: (_status: number, _headers: unknown) => {},
      write: (chunk: unknown) => {
        const encoder = new TextEncoder()
        const data = typeof chunk === 'string' ? encoder.encode(chunk) : chunk as Uint8Array
        void writer.write(data)
        return true
      },
      end: () => {
        void writer.close()
        transports.delete(sessionId)
      },
    }

    const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, resMock as never)
    transports.set(sessionId, transport)

    server.connect(transport).catch((e) => {
      console.error('Failed to connect transport', e)
      void writer.close()
      transports.delete(sessionId)
    })

    return c.body(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  })

  app.post('/messages', async (c) => {
    const sessionId = c.req.query('sessionId')
    if (!sessionId) return c.text('Missing sessionId', 400)

    const transport = transports.get(sessionId)
    if (!transport) return c.text('No active connection', 404)

    const body: unknown = await c.req.json()
    await transport.handlePostMessage(c.req.raw as never, c.res as never, body)
    return c.text('Accepted', 202)
  })

  return app
}
