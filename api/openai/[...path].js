export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
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

  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {})

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: req.method,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body,
  })

  const text = await upstream.text()
  res.status(upstream.status)
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
  res.send(text)
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
    maxDuration: 60,
  },
}
