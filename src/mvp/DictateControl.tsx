import { useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { transcribeAudio } from './elevenlabsClient'

export function DictateControl({
  onTranscript,
}: {
  onTranscript: (text: string) => void
}) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [phase, setPhase] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [error, setError] = useState('')

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        void (async () => {
          setPhase('transcribing')
          try {
            const text = await transcribeAudio(blob)
            if (text) onTranscript(text)
            else setError('No speech was recognized.')
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Could not transcribe that recording.')
          } finally {
            setPhase('idle')
          }
        })()
      }
      recorderRef.current = recorder
      recorder.start()
      setPhase('recording')
    } catch {
      setError('Microphone access was denied.')
    }
  }

  function stop() {
    if (recorderRef.current && phase === 'recording') {
      recorderRef.current.stop()
      recorderRef.current = null
    }
  }

  return (
    <div className="mvp-dictate">
      <button
        type="button"
        className={`mvp-btn mvp-btn-ghost mvp-dictate-btn${phase === 'recording' ? ' is-recording' : ''}`}
        onClick={() => {
          if (phase === 'recording') stop()
          else void start()
        }}
        disabled={phase === 'transcribing'}
        aria-pressed={phase === 'recording'}
      >
        {phase === 'recording' ? <Square aria-hidden /> : <Mic aria-hidden />}
        {phase === 'transcribing' ? 'Transcribing…' : phase === 'recording' ? 'Stop' : 'Dictate'}
      </button>
      {error && <p className="mvp-error">{error}</p>}
    </div>
  )
}
