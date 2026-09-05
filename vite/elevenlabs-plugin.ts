import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { handleStt, handleTts } from '../server/elevenlabs.ts'

async function readNodeRequest(req: IncomingMessage) {
  const host = req.headers.host ?? 'localhost'
  const url = `http://${host}${req.url ?? '/'}`
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const body = Buffer.concat(chunks)

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  return new Request(url, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  })
}

async function writeNodeResponse(web: Response, res: ServerResponse) {
  res.statusCode = web.status
  web.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  const buffer = Buffer.from(await web.arrayBuffer())
  res.end(buffer)
}

function attach(middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void }) {
  middlewares.use((req, res, next) => {
    const path = req.url?.split('?')[0]
    if (path !== '/api/tts' && path !== '/api/stt') {
      next()
      return
    }

    void (async () => {
      const request = await readNodeRequest(req)
      const response = path === '/api/tts' ? await handleTts(request) : await handleStt(request)
      await writeNodeResponse(response, res)
    })().catch(() => {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Something went wrong.' }))
    })
  })
}

export function elevenlabsPlugin(): Plugin {
  return {
    name: 'heritage-elevenlabs',
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}
