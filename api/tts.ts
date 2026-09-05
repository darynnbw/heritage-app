import { handleTts } from '../server/elevenlabs'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    return await handleTts(request)
  } catch (error) {
    console.error('TTS failed', error)
    return Response.json({ error: 'Could not prepare the reading.' }, { status: 500 })
  }
}
