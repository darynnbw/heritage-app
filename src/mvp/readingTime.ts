const WORDS_PER_MINUTE = 200

export function readingMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return 0
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

export function readingTimeLabel(text: string) {
  const minutes = readingMinutes(text)
  if (minutes === 0) return ''
  return minutes === 1 ? '1 min read' : `${minutes} min read`
}
