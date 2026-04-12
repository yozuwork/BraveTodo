import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
      catch (e) { reject(e) }
    })
  })
}

function devPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {

      // ── Save favicon to public/favicon.png ──────────────────
      server.middlewares.use('/api/save-favicon', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        try {
          const { dataUrl } = await parseBody(req)
          const m = dataUrl.match(/^data:image\/png;base64,(.+)$/)
          if (!m) throw new Error('Expected PNG data URL')
          const publicDir = join(__dirname, 'public')
          if (!existsSync(publicDir)) mkdirSync(publicDir)
          writeFileSync(join(publicDir, 'favicon.png'), Buffer.from(m[1], 'base64'))
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      // ── Save any image to public/uploads/ ───────────────────
      server.middlewares.use('/api/save-image', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        try {
          const { dataUrl, path: relPath } = await parseBody(req)
          // Strip data URL header: data:image/jpeg;base64,XXXX
          const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/)
          if (!m) throw new Error('Invalid data URL')
          const buf = Buffer.from(m[1], 'base64')
          const dest = join(__dirname, 'public', relPath)
          // Ensure directory exists
          const dir = dirname(dest)
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
          writeFileSync(dest, buf)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, path: relPath }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      // ── Save page title to index.html ────────────────────────
      server.middlewares.use('/api/save-title', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        try {
          const { title } = await parseBody(req)
          const htmlPath = join(__dirname, 'index.html')
          let html = readFileSync(htmlPath, 'utf-8')
          html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
          writeFileSync(htmlPath, html, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devPlugin()],
  base: '/BraveTodo/',
})
