import { handleStt } from '../server/elevenlabs'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    return await handleStt(request)
  } catch (error) {
    console.error('STT failed', error)
    return Response.json({ error: 'Could not transcribe that recording.' }, { status: 500 })
  }
}
