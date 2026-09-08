import type { Screen, Tab } from './types'

export type AppLocation = {
  screen: Screen
  tab: Tab
  relativeId: string | null
  storyId: string | null
  writePrompt: string | null
  editingStoryId: string | null
  redirectPath: string | null
}

function normalize(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

function guestHome(): AppLocation {
  return { screen: 'welcome', tab: 'home', relativeId: null, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
}

function missingLocation(): AppLocation {
  return { screen: 'not-found', tab: 'home', relativeId: null, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
}

function authLocation(mode: 'login' | 'signup', redirectPath: string | null = null): AppLocation {
  return {
    screen: mode,
    tab: 'home',
    relativeId: null,
    storyId: null,
    writePrompt: null,
    editingStoryId: null,
    redirectPath,
  }
}

function protectedRedirect(pathname: string, search = ''): AppLocation {
  return authLocation('login', `${pathname}${search}`)
}

export function locationFromPath(pathname: string, session: string | null, search = ''): AppLocation {
  const path = normalize(pathname)
  const missing = missingLocation()
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const redirectPath = params.get('redirect')

  if (path === '/' || path === '/home') {
    if (path === '/home' && session) {
      return { screen: 'home', tab: 'home', relativeId: null, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
    }
    if (session) {
      return { screen: 'home', tab: 'home', relativeId: null, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
    }
    return guestHome()
  }

  if (path === '/login') return authLocation('login', redirectPath)
  if (path === '/signup') return authLocation('signup', redirectPath)
  if (path === '/forgot-password') {
    return {
      screen: 'forgot-password',
      tab: 'home',
      relativeId: null,
      storyId: null,
      writePrompt: null,
      editingStoryId: null,
      redirectPath: null,
    }
  }
  if (path === '/reset-password') {
    return {
      screen: 'reset-password',
      tab: 'home',
      relativeId: null,
      storyId: null,
      writePrompt: null,
      editingStoryId: null,
      redirectPath: null,
    }
  }
  if (path === '/not-found') return missing

  if (path === '/people') {
    if (!session) return protectedRedirect(path, search)
    return { screen: 'people', tab: 'people', relativeId: null, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
  }

  if (path === '/people/new') {
    if (!session) return protectedRedirect(path, search)
    return { screen: 'add-relative', tab: 'people', relativeId: null, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
  }

  if (path === '/settings') {
    if (!session) return protectedRedirect(path, search)
    return { screen: 'settings', tab: 'settings', relativeId: null, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
  }

  if (path === '/stories/new') {
    if (!session) return protectedRedirect(path, search)
    const relativeId = params.get('person')
    const writePrompt = params.get('prompt') ?? ''
    return {
      screen: 'write',
      tab: relativeId ? 'people' : 'home',
      relativeId,
      storyId: null,
      writePrompt,
      editingStoryId: null,
      redirectPath: null,
    }
  }

  const personEditMatch = path.match(/^\/people\/([^/]+)\/edit$/)
  if (personEditMatch) {
    const relativeId = decodeURIComponent(personEditMatch[1])
    if (!session) return protectedRedirect(path, search)
    return { screen: 'edit-relative', tab: 'people', relativeId, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
  }

  const personMatch = path.match(/^\/people\/([^/]+)$/)
  if (personMatch) {
    const relativeId = decodeURIComponent(personMatch[1])
    if (!session) return protectedRedirect(path, search)
    return { screen: 'relative', tab: 'people', relativeId, storyId: null, writePrompt: null, editingStoryId: null, redirectPath: null }
  }

  const storyEditMatch = path.match(/^\/stories\/([^/]+)\/edit$/)
  if (storyEditMatch) {
    const editingStoryId = decodeURIComponent(storyEditMatch[1])
    if (!session) return protectedRedirect(path, search)
    return { screen: 'write', tab: 'home', relativeId: null, storyId: null, writePrompt: null, editingStoryId, redirectPath: null }
  }

  const storyMatch = path.match(/^\/stories\/([^/]+)$/)
  if (storyMatch) {
    const storyId = decodeURIComponent(storyMatch[1])
    if (!session) return protectedRedirect(path, search)
    return { screen: 'story', tab: 'home', relativeId: null, storyId, writePrompt: null, editingStoryId: null, redirectPath: null }
  }

  return missing
}

export function pathForLocation(location: AppLocation) {
  if (location.screen === 'login' || location.screen === 'signup') {
    const params = new URLSearchParams()
    if (location.redirectPath) params.set('redirect', location.redirectPath)
    const query = params.toString()
    return query ? `/${location.screen}?${query}` : `/${location.screen}`
  }

  if (location.screen === 'forgot-password') return '/forgot-password'
  if (location.screen === 'reset-password') return '/reset-password'

  if (location.screen === 'write') {
    if (location.editingStoryId) return `/stories/${location.editingStoryId}/edit`
    const params = new URLSearchParams()
    if (location.relativeId) params.set('person', location.relativeId)
    if (location.writePrompt?.trim()) params.set('prompt', location.writePrompt.trim())
    const query = params.toString()
    return query ? `/stories/new?${query}` : '/stories/new'
  }

  if (location.screen === 'edit-relative' && location.relativeId) return `/people/${location.relativeId}/edit`
  if (location.screen === 'relative' && location.relativeId) return `/people/${location.relativeId}`
  if (location.screen === 'story' && location.storyId) return `/stories/${location.storyId}`
  if (location.screen === 'add-relative') return '/people/new'
  if (location.screen === 'people') return '/people'
  if (location.screen === 'settings') return '/settings'
  if (location.screen === 'home') return '/home'
  if (location.screen === 'not-found') return '/not-found'
  return '/'
}

export function pathFor(screen: Screen, relativeId?: string | null, storyId?: string | null) {
  if (screen === 'not-found') return '/not-found'
  if (screen === 'login') return '/login'
  if (screen === 'signup') return '/signup'
  if (screen === 'forgot-password') return '/forgot-password'
  if (screen === 'reset-password') return '/reset-password'
  if (screen === 'home') return '/home'
  if (screen === 'people') return '/people'
  if (screen === 'add-relative') return '/people/new'
  if (screen === 'settings') return '/settings'
  if (screen === 'write') return '/stories/new'
  if (screen === 'edit-relative' && relativeId) return `/people/${relativeId}/edit`
  if (screen === 'relative' && relativeId) return `/people/${relativeId}`
  if (screen === 'story' && storyId) return `/stories/${storyId}`
  return '/'
}

export function replacePath(path: string) {
  const current = window.location.pathname + window.location.search
  if (current === path) return
  window.history.replaceState({}, '', path)
}

export function pushPath(path: string) {
  const current = window.location.pathname + window.location.search
  if (current === path) return
  window.history.pushState({}, '', path)
}
