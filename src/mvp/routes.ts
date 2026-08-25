import type { Screen, Tab } from './types'

export type AppLocation = {
  screen: Screen
  tab: Tab
  relativeId: string | null
  storyId: string | null
}

function normalize(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

function guestHome(): AppLocation {
  return { screen: 'welcome', tab: 'home', relativeId: null, storyId: null }
}

export function locationFromPath(pathname: string, session: string | null): AppLocation {
  const path = normalize(pathname)
  const missing: AppLocation = {
    screen: 'not-found',
    tab: 'home',
    relativeId: null,
    storyId: null,
  }

  if (path === '/' || path === '/home') {
    if (path === '/home' && session) {
      return { screen: 'home', tab: 'home', relativeId: null, storyId: null }
    }
    if (session) {
      return { screen: 'home', tab: 'home', relativeId: null, storyId: null }
    }
    return guestHome()
  }

  if (path === '/login') return { screen: 'login', tab: 'home', relativeId: null, storyId: null }
  if (path === '/signup') return { screen: 'signup', tab: 'home', relativeId: null, storyId: null }
  if (path === '/not-found') return missing

  if (path === '/people') {
    if (!session) return missing
    return { screen: 'people', tab: 'people', relativeId: null, storyId: null }
  }

  if (path === '/settings') {
    if (!session) return missing
    return { screen: 'settings', tab: 'settings', relativeId: null, storyId: null }
  }

  const personMatch = path.match(/^\/people\/([^/]+)$/)
  if (personMatch) {
    const relativeId = decodeURIComponent(personMatch[1])
    if (!session) return missing
    return { screen: 'relative', tab: 'people', relativeId, storyId: null }
  }

  const storyMatch = path.match(/^\/stories\/([^/]+)$/)
  if (storyMatch) {
    const storyId = decodeURIComponent(storyMatch[1])
    if (!session) return missing
    return { screen: 'story', tab: 'home', relativeId: null, storyId }
  }

  return missing
}

export function pathFor(screen: Screen, relativeId?: string | null, storyId?: string | null) {
  if (screen === 'not-found') return '/not-found'
  if (screen === 'login') return '/login'
  if (screen === 'signup') return '/signup'
  if (screen === 'home') return '/home'
  if (screen === 'people') return '/people'
  if (screen === 'settings') return '/settings'
  if (screen === 'relative' && relativeId) return `/people/${relativeId}`
  if (screen === 'story' && storyId) return `/stories/${storyId}`
  return '/'
}

export function replacePath(path: string) {
  if (window.location.pathname === path) return
  window.history.replaceState({}, '', path)
}

export function pushPath(path: string) {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
}
