const TTS_CHUNK = 4000

function splitForSpeech(text: string) {
  const trimmed = text.trim()
  if (trimmed.length <= TTS_CHUNK) return [trimmed]

  const parts: string[] = []
  let remaining = trimmed
  while (remaining.length > TTS_CHUNK) {
    const window = remaining.slice(0, TTS_CHUNK)
    const breakAt = Math.max(
      window.lastIndexOf('\n\n'),
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? '),
    )
    const cut = breakAt > TTS_CHUNK / 3 ? breakAt + 1 : TTS_CHUNK
    parts.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) parts.push(remaining)
  return parts
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string }
    return data.error || 'Something went wrong.'
  } catch {
    return 'Something went wrong.'
  }
}

export async function fetchStorySpeech(text: string) {
  const chunks = splitForSpeech(text)
  const urls: string[] = []

  for (const chunk of chunks) {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk }),
    })
    if (!response.ok) {
      urls.forEach((url) => URL.revokeObjectURL(url))
      throw new Error(await readError(response))
    }
    const blob = await response.blob()
    urls.push(URL.createObjectURL(blob))
  }

  return urls
}

export async function transcribeAudio(blob: Blob) {
  const form = new FormData()
  form.set('audio', blob, 'clip.webm')

  const response = await fetch('/api/stt', {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    throw new Error(await readError(response))
  }
  const data = (await response.json()) as { text?: string }
  return data.text?.trim() ?? ''
}
