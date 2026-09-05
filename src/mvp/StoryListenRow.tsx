import { useEffect, useRef, useState } from 'react'
import { Pause, Volume2 } from 'lucide-react'
import { fetchStorySpeech } from './elevenlabsClient'
import { readingTimeLabel } from './readingTime'

export function StoryListenRow({ text }: { text: string }) {
  const label = readingTimeLabel(text)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlsRef = useRef<string[]>([])
  const indexRef = useRef(0)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [error, setError] = useState('')

  function release() {
    audioRef.current?.pause()
    audioRef.current = null
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    urlsRef.current = []
    indexRef.current = 0
  }

  useEffect(() => {
    return () => release()
  }, [text])

  function playFrom(index: number) {
    const url = urlsRef.current[index]
    if (!url) {
      setPhase('idle')
      return
    }
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => {
      indexRef.current = index + 1
      playFrom(index + 1)
    }
    audio.onerror = () => {
      setError('Could not play the reading.')
      setPhase('idle')
      release()
    }
    void audio.play().then(() => setPhase('playing')).catch(() => {
      setError('Could not play the reading.')
      setPhase('idle')
    })
  }

  async function handleListen() {
    setError('')
    if (phase === 'playing') {
      release()
      setPhase('idle')
      return
    }
    if (!text.trim()) return

    setPhase('loading')
    try {
      const urls = await fetchStorySpeech(text)
      urlsRef.current = urls
      indexRef.current = 0
      playFrom(0)
    } catch (caught) {
      setPhase('idle')
      setError(caught instanceof Error ? caught.message : 'Could not prepare the reading.')
    }
  }

  if (!text.trim()) return null

  const busy = phase === 'loading'

  return (
    <div className="mvp-listen">
      <div className="mvp-listen-row">
        <button
          type="button"
          className={`mvp-btn mvp-btn-ghost mvp-listen-btn${phase === 'playing' ? ' is-playing' : ''}`}
          onClick={() => void handleListen()}
          disabled={busy}
          aria-pressed={phase === 'playing'}
          aria-label={phase === 'playing' ? 'Pause reading' : 'Listen to this story'}
        >
          {phase === 'playing' ? <Pause aria-hidden /> : <Volume2 aria-hidden />}
          {busy ? 'Preparing…' : phase === 'playing' ? 'Pause' : 'Listen'}
        </button>
        {label && (
          <p className="mvp-read-time">{label}</p>
        )}
      </div>
      {error && <p className="mvp-error">{error}</p>}
    </div>
  )
}
