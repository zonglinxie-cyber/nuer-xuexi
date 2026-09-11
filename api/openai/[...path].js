export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } })
    return
  }

  const parts = req.query.path
  const path = Array.isArray(parts) ? parts.join('/') : String(parts || '')
  if (path !== 'v1/chat/completions') {
    res.status(404).json({ error: { message: 'Not found' } })
    return
  }

  const authorization = req.headers.authorization
  if (!authorization) {
    res.status(401).json({ error: { message: 'Missing API key' } })
    return
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180_000)

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
    })

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    res.status(timedOut ? 504 : 502).json({
      error: { message: timedOut ? 'Upstream timeout' : 'Upstream request failed' },
    })
  } finally {
    clearTimeout(timeout)
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
    maxDuration: 180,
  },
}
