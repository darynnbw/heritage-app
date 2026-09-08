export function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return
  try {
    switch (style) {
      case 'light':
      case 'selection':
        navigator.vibrate(8)
        break
      case 'medium':
        navigator.vibrate(15)
        break
      case 'heavy':
        navigator.vibrate(25)
        break
      case 'success':
        navigator.vibrate([10, 30, 15])
        break
      case 'warning':
        navigator.vibrate([20, 40, 20])
        break
    }
  } catch {
    // Unsupported or blocked
  }
}
