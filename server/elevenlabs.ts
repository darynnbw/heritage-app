const ELEVEN_API = 'https://api.elevenlabs.io/v1'
const TTS_MODEL = 'eleven_multilingual_v2'
const STT_MODEL = 'scribe_v2'
const MAX_TTS_CHARS = 4500

function apiKey() {
  return process.env.ELEVENLABS_API_KEY?.trim() ?? ''
}

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

async function elevenFetch(path: string, init: RequestInit) {
  const headers = new Headers(init.headers)
  headers.set('xi-api-key', apiKey())
  return fetch(`${ELEVEN_API}${path}`, { ...init, headers })
}

async function resolveVoiceId() {
  const configured = process.env.ELEVENLABS_VOICE_ID?.trim()
  if (configured) return configured

  const response = await elevenFetch('/voices', { method: 'GET' })
  if (!response.ok) return '21m00Tcm4TlvDq8ikWAM'

  const data = (await response.json()) as {
    voices?: { voice_id: string; name: string }[]
  }
  const voices = data.voices ?? []
  const preferred = voices.find((voice) =>
    /sarah|rachel|narrat|story|warm/i.test(voice.name),
  )
  return preferred?.voice_id ?? voices[0]?.voice_id ?? '21m00Tcm4TlvDq8ikWAM'
}

export async function handleTts(request: Request) {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed.', 405)
  }
  if (!apiKey()) {
    return jsonError('Listening is not configured yet.', 503)
  }

  let body: { text?: string }
  try {
    body = (await request.json()) as { text?: string }
  } catch {
    return jsonError('Could not read that request.')
  }

  const text = body.text?.trim() ?? ''
  if (!text) return jsonError('There is nothing to read.')
  if (text.length > MAX_TTS_CHARS) {
    return jsonError('This story is too long to read in one pass. Try a shorter section.')
  }

  const voiceId = await resolveVoiceId()

  const response = await elevenFetch(`/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
    }),
  })

  if (!response.ok) {
    return jsonError('Could not prepare the reading.', 502)
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}

export async function handleStt(request: Request) {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed.', 405)
  }
  if (!apiKey()) {
    return jsonError('Dictation is not configured yet.', 503)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonError('Could not read that recording.')
  }

  const audio = form.get('audio')
  if (!(audio instanceof File) || audio.size === 0) {
    return jsonError('Record a clip before transcribing.')
  }

  const outbound = new FormData()
  outbound.set('model_id', STT_MODEL)
  outbound.set('file', audio, audio.name || 'clip.webm')
  outbound.set('tag_audio_events', 'false')

  const response = await elevenFetch('/speech-to-text', {
    method: 'POST',
    body: outbound,
  })

  if (!response.ok) {
    return jsonError('Could not transcribe that recording.', 502)
  }

  const data = (await response.json()) as { text?: string }
  return Response.json({ text: data.text?.trim() ?? '' })
}
