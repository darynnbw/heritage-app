import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  LogOut,
  MoreHorizontal,
  PenLine,
  Plus,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import welcomeHeroUrl from '../assets/illustration-welcome.svg'
import authFamilyUrl from '../assets/illustration-auth-family.svg'
import readingIllustrationUrl from '../assets/illustration-reading.svg'
import journalIllustrationUrl from '../assets/illustration-journal.svg'
import peopleIllustrationUrl from '../assets/illustration-people.svg'
import notFoundIllustrationUrl from '../assets/illustration-not-found.svg'
import settingsIllustrationUrl from '../assets/cherry-blossom-cuate-1.svg'
import { HOME_PROMPTS, RELATIONSHIP_CHIPS, RELATIONSHIP_SUGGESTIONS } from './prompts'
import { messageFromError, store } from './store'
import { locationFromPath, pathForLocation, pushPath, replacePath } from './routes'
import { DictateControl } from './DictateControl'
import { StoryListenRow } from './StoryListenRow'
import { triggerHaptic } from './haptics'
import type { Relative, Screen, SessionUser, Story, Tab } from './types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function snippet(text: string) {
  return text.trim()
}

function personLabel(person: Relative) {
  if (!person.relationship) return person.name
  const relation = person.relationship.charAt(0).toUpperCase() + person.relationship.slice(1)
  return `${relation} ${person.name}`
}

function onboardingNameInitial(user: SessionUser): string {
  const name = user.displayName.trim()
  if (!name || name === 'Friend') return ''
  const fromEmail = user.email.split('@')[0]?.trim().toLowerCase()
  if (fromEmail && name.toLowerCase() === fromEmail) return ''
  return name
}

function storyDraftKey(kind: 'write' | 'onboarding', options: { storyId?: string; relativeId?: string | null; prompt?: string }) {
  if (kind === 'write' && options.storyId) return `heritage:draft:story:${options.storyId}`
  if (kind === 'onboarding') return `heritage:draft:onboarding:${options.relativeId ?? 'unknown'}`
  return `heritage:draft:write:${options.relativeId ?? 'picker'}:${options.prompt?.trim() || 'freewrite'}`
}

function loadDraft(key: string) {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) ?? ''
}

function saveDraft(key: string, value: string) {
  if (typeof window === 'undefined') return
  const trimmed = value.trim()
  if (!trimmed) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, value)
}

function clearDraft(key: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

function useBeforeUnloadWhen(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [enabled])
}

function LeaveConfirm({
  open,
  title = 'Discard your changes?',
  body = 'You have unsaved changes. If you leave now, they will be lost.',
  onStay,
  onDiscard,
}: {
  open: boolean
  title?: string
  body?: string
  onStay: () => void
  onDiscard: () => void
}) {
  if (!open) return null

  return (
    <div className="mvp-modal-backdrop" onClick={() => { triggerHaptic('light'); onStay(); }}>
      <div className="mvp-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="mvp-sheet-grabber" />
        <h2 className="mvp-modal-title">{title}</h2>
        <p className="mvp-modal-msg">{body}</p>
        <div className="mvp-modal-actions">
          <button
            className="mvp-btn mvp-btn-ghost"
            type="button"
            onClick={() => { triggerHaptic('light'); onStay(); }}
          >
            Keep editing
          </button>
          <button
            className="mvp-btn mvp-btn-danger"
            type="button"
            onClick={() => { triggerHaptic('warning'); onDiscard(); }}
          >
            Discard draft
          </button>
        </div>
      </div>
    </div>
  )
}

export function HeritageMvp() {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [relatives, setRelatives] = useState<Relative[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState('')
  const [screen, setScreen] = useState<Screen>('welcome')
  const [tab, setTab] = useState<Tab>('home')
  const [promptIndex, setPromptIndex] = useState(0)
  const [relativeId, setRelativeId] = useState<string | null>(null)
  const [storyId, setStoryId] = useState<string | null>(null)
  const [writePrompt, setWritePrompt] = useState('')
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null)
  const [storyReturn, setStoryReturn] = useState<'home' | 'relative'>('home')
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null)
  const [authEmailDraft, setAuthEmailDraft] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const appliedBootRoute = useRef(false)

  const userId = session?.id ?? null
  const story = stories.find((item) => item.id === storyId) ?? null
  const relative =
    relatives.find((item) => item.id === relativeId) ??
    relatives.find((item) => item.id === story?.relativeId) ??
    null
  const prompt = HOME_PROMPTS[promptIndex % HOME_PROMPTS.length]
  const showMobileTabs = screen === 'home' || screen === 'people' || screen === 'relative' || screen === 'settings'
  const showDesktopNav = Boolean(userId) && !['welcome', 'login', 'signup', 'forgot-password', 'reset-password', 'onboarding-intro', 'onboarding-name', 'onboarding-relative', 'onboarding-story', 'add-relative', 'edit-relative', 'write', 'not-found'].includes(screen)

  function applyLibrary(library: { user: SessionUser; relatives: Relative[]; stories: Story[] }) {
    setSession(library.user)
    setRelatives(library.relatives)
    setStories(library.stories)
  }

  function applyLocation(next: ReturnType<typeof locationFromPath>, nextStories: Story[] = stories) {
    const matchedStory = next.storyId ? nextStories.find((item) => item.id === next.storyId) : undefined
    const matchedEditStory = next.editingStoryId
      ? nextStories.find((item) => item.id === next.editingStoryId)
      : undefined
    setScreen(next.screen)
    setTab(next.tab)
    setRelativeId(next.relativeId ?? matchedStory?.relativeId ?? matchedEditStory?.relativeId ?? null)
    setStoryId(next.storyId)
    setWritePrompt(next.writePrompt ?? '')
    setEditingStoryId(next.editingStoryId)
    setAuthRedirectPath(next.redirectPath)
  }

  function applyResolvedLocation(next: ReturnType<typeof locationFromPath>, nextStories: Story[] = stories) {
    applyLocation(next, nextStories)
    replacePath(pathForLocation(next))
  }

  async function refreshLibrary() {
    const library = await store.loadLibrary()
    applyLibrary(library)
    return library
  }

  useEffect(() => {
    let cancelled = false
    let receivedAuthEvent = false

    async function hydrate(userId: string | null) {
      if (!userId) {
        if (cancelled) return
        setSession(null)
        setRelatives([])
        setStories([])
        setBootError('')
        setReady(true)
        return
      }
      try {
        const library = await store.loadLibrary()
        if (cancelled) return
        applyLibrary(library)
        setBootError('')
      } catch (error) {
        if (!cancelled) setBootError(messageFromError(error))
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED') return
      if (event === 'PASSWORD_RECOVERY') {
        receivedAuthEvent = true
        setPasswordRecovery(true)
        setScreen('reset-password')
        replacePath('/reset-password')
        void hydrate(nextSession?.user.id ?? null)
        return
      }
      receivedAuthEvent = true
      void hydrate(nextSession?.user.id ?? null)
    })

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (cancelled || receivedAuthEvent) return
      void hydrate(sessionData.session?.user.id ?? null)
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!ready || appliedBootRoute.current) return
    appliedBootRoute.current = true
    const loc = locationFromPath(window.location.pathname, session?.id ?? null, window.location.search)
    if (loc.screen === 'reset-password' || passwordRecovery) {
      setPasswordRecovery(true)
      setScreen('reset-password')
      replacePath('/reset-password')
      return
    }
    if (loc.screen === 'forgot-password') {
      setScreen('forgot-password')
      replacePath('/forgot-password')
      return
    }
    if (session && (loc.screen === 'welcome' || loc.screen === 'login' || loc.screen === 'signup')) {
      if (relatives.length === 0) {
        setScreen('onboarding-intro')
        replacePath('/')
        return
      }
      setTab('home')
      setScreen('home')
      replacePath('/home')
      return
    }
    applyResolvedLocation(loc, stories)
  }, [ready, session, relatives, stories, passwordRecovery])

  useEffect(() => {
    function onPop() {
      applyResolvedLocation(locationFromPath(window.location.pathname, session?.id ?? null, window.location.search))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [session, stories])

  function goTab(next: Tab) {
    triggerHaptic('selection')
    setTab(next)
    if (next === 'home') {
      setScreen('home')
      pushPath('/home')
    }
    if (next === 'people') {
      setScreen('people')
      pushPath('/people')
    }
    if (next === 'settings') {
      setScreen('settings')
      pushPath('/settings')
    }
  }

  function openRelative(id: string) {
    setRelativeId(id)
    setTab('people')
    setScreen('relative')
    pushPath(`/people/${id}`)
  }

  function openAddRelative() {
    setTab('people')
    setScreen('add-relative')
    pushPath('/people/new')
  }

  function openEditRelative(id: string) {
    setRelativeId(id)
    setTab('people')
    setScreen('edit-relative')
    pushPath(`/people/${id}/edit`)
  }

  function openStory(id: string, from: 'home' | 'relative') {
    const found = stories.find((item) => item.id === id)
    setStoryId(id)
    setRelativeId(found?.relativeId ?? relativeId)
    setStoryReturn(from)
    setScreen('story')
    pushPath(`/stories/${id}`)
  }

  function startWrite(nextPrompt: string, presetRelativeId: string | null = null) {
    setWritePrompt(nextPrompt)
    setEditingStoryId(null)
    setRelativeId(presetRelativeId)
    setStoryId(null)
    setScreen('write')
    const params = new URLSearchParams()
    if (presetRelativeId) params.set('person', presetRelativeId)
    if (nextPrompt.trim()) params.set('prompt', nextPrompt.trim())
    const query = params.toString()
    pushPath(query ? `/stories/new?${query}` : '/stories/new')
  }

  function openEditStory(story: Story) {
    setEditingStoryId(story.id)
    setWritePrompt(story.prompt)
    setRelativeId(story.relativeId)
    setStoryId(story.id)
    setScreen('write')
    pushPath(`/stories/${story.id}/edit`)
  }

  async function afterAuth(isNew: boolean) {
    const library = await refreshLibrary()
    if (isNew || library.relatives.length === 0) {
      setScreen('onboarding-intro')
      setAuthRedirectPath(null)
      replacePath('/')
      return
    }

    const redirectLocation = authRedirectPath
      ? locationFromPath(authRedirectPath, library.user.id)
      : null
    if (redirectLocation && redirectLocation.screen !== 'welcome' && redirectLocation.screen !== 'login' && redirectLocation.screen !== 'signup' && redirectLocation.screen !== 'forgot-password' && redirectLocation.screen !== 'reset-password' && redirectLocation.screen !== 'not-found') {
      applyLocation(redirectLocation, library.stories)
      replacePath(pathForLocation(redirectLocation))
      return
    }

    setTab('home')
    setScreen('home')
    setAuthRedirectPath(null)
    replacePath('/home')
  }

  function goHome() {
    setTab('home')
    setRelativeId(null)
    setStoryId(null)
    if (session) {
      setScreen('home')
      pushPath('/home')
      return
    }
    setScreen('welcome')
    pushPath('/')
  }

  if (!ready) {
    return (
      <div className="mvp mvp-boot">
        <p className="mvp-brand">Heritage</p>
        <p className="mvp-boot-copy">Opening your stories…</p>
      </div>
    )
  }

  if (bootError) {
    return (
      <div className="mvp mvp-boot">
        <p className="mvp-brand">Heritage</p>
        <p className="mvp-error">{bootError}</p>
        <button className="mvp-btn mvp-btn-primary" type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="mvp">
      <div className={`mvp-shell${showMobileTabs ? ' has-tabs' : ''}`}>
        {showDesktopNav && (
          <DesktopNav tab={tab} onTab={goTab} />
        )}

        {screen === 'welcome' && (
          <WelcomeScreen
            onLogin={() => {
              setScreen('login')
              pushPath('/login')
            }}
            onSignup={() => {
              setScreen('signup')
              pushPath('/signup')
            }}
          />
        )}
        {screen === 'login' && (
          <AuthScreen
            mode="login"
            onDone={afterAuth}
            redirectPath={authRedirectPath}
            initialEmail={authEmailDraft}
            initialNotice={authNotice}
            onForgotPassword={(email) => {
              setAuthEmailDraft(email)
              setAuthNotice('')
              setScreen('forgot-password')
              pushPath('/forgot-password')
            }}
            onSwitch={(options) => {
              setAuthEmailDraft(options?.email ?? '')
              setAuthNotice(options?.notice ?? '')
              setScreen('signup')
              const params = new URLSearchParams()
              if (authRedirectPath) params.set('redirect', authRedirectPath)
              const query = params.toString()
              pushPath(query ? `/signup?${query}` : '/signup')
            }}
          />
        )}
        {screen === 'signup' && (
          <AuthScreen
            mode="signup"
            onDone={afterAuth}
            redirectPath={authRedirectPath}
            initialEmail={authEmailDraft}
            initialNotice={authNotice}
            onSwitch={(options) => {
              setAuthEmailDraft(options?.email ?? '')
              setAuthNotice(options?.notice ?? '')
              setScreen('login')
              const params = new URLSearchParams()
              if (authRedirectPath) params.set('redirect', authRedirectPath)
              const query = params.toString()
              pushPath(query ? `/login?${query}` : '/login')
            }}
          />
        )}
        {screen === 'forgot-password' && (
          <ForgotPasswordScreen
            initialEmail={authEmailDraft}
            onBack={(email) => {
              setAuthEmailDraft(email)
              setAuthNotice('')
              setScreen('login')
              pushPath('/login')
            }}
          />
        )}
        {screen === 'reset-password' && (
          <ResetPasswordScreen
            hasSession={Boolean(userId)}
            onDone={async () => {
              setPasswordRecovery(false)
              await afterAuth(false)
            }}
            onRequestNewLink={() => {
              setPasswordRecovery(false)
              setScreen('forgot-password')
              pushPath('/forgot-password')
            }}
          />
        )}
        {screen === 'onboarding-intro' && (
          <OnboardingIntro
            onContinue={() => setScreen('onboarding-name')}
            onSkip={goHome}
          />
        )}
        {screen === 'onboarding-name' && userId && session && (
          <OnboardingName
            initialName={onboardingNameInitial(session)}
            onBack={() => setScreen('onboarding-intro')}
            onContinue={async () => {
              await refreshLibrary()
              setScreen('onboarding-relative')
            }}
            onSkip={() => setScreen('onboarding-relative')}
          />
        )}
        {screen === 'onboarding-relative' && userId && (
          <OnboardingRelative
            existing={relative}
            onBack={() => setScreen('onboarding-name')}
            onContinue={async (id) => {
              setRelativeId(id)
              await refreshLibrary()
              setScreen('onboarding-story')
            }}
            onSkip={goHome}
          />
        )}
        {screen === 'onboarding-story' && userId && relative && (
          <OnboardingStory
            relative={relative}
            onBack={() => setScreen('onboarding-relative')}
            onSaved={async () => {
              await refreshLibrary()
              setTab('people')
              setScreen('relative')
              pushPath(`/people/${relative.id}`)
            }}
            onSkip={goHome}
          />
        )}
        {screen === 'home' && userId && (
          <HomeScreen
            prompt={prompt}
            stories={stories}
            relatives={relatives}
            onSwap={() => setPromptIndex((value) => value + 1)}
            onWrite={() => startWrite(prompt)}
            onFreeWrite={() => startWrite('')}
            onOpenStory={(id) => openStory(id, 'home')}
          />
        )}
        {screen === 'people' && userId && (
          <PeopleScreen
            relatives={relatives}
            stories={stories}
            onOpen={openRelative}
            onAddPerson={openAddRelative}
          />
        )}
        {screen === 'add-relative' && userId && (
          <RelativeFormScreen
            onBack={() => {
              setScreen('people')
              pushPath('/people')
            }}
            onSaved={async (id) => {
              await refreshLibrary()
              openRelative(id)
            }}
          />
        )}
        {screen === 'edit-relative' && userId && relative && (
          <RelativeFormScreen
            relative={relative}
            onBack={() => {
              setScreen('relative')
              pushPath(`/people/${relative.id}`)
            }}
            onSaved={async (id) => {
              await refreshLibrary()
              openRelative(id)
            }}
          />
        )}
        {screen === 'edit-relative' && userId && !relative && (
          <NotFoundScreen onHome={goHome} />
        )}
        {screen === 'not-found' && <NotFoundScreen onHome={goHome} />}
        {screen === 'relative' && userId && relative && (
          <RelativeScreen
            relative={relative}
            stories={stories.filter((item) => item.relativeId === relative.id)}
            onBack={() => {
              setTab('people')
              setScreen('people')
              pushPath('/people')
            }}
            onOpenStory={(id) => openStory(id, 'relative')}
            onWrite={() => startWrite('', relative.id)}
            onEdit={() => openEditRelative(relative.id)}
            onDelete={async () => {
              await store.deleteRelative(relative.id)
              await refreshLibrary()
              setRelativeId(null)
              setTab('people')
              setScreen('people')
              pushPath('/people')
            }}
          />
        )}
        {screen === 'relative' && userId && !relative && (
          <NotFoundScreen onHome={goHome} />
        )}
        {screen === 'story' && relative && story && (
          <StoryScreen
            relative={relative}
            story={story}
            backLabel={storyReturn === 'relative' ? relative.name : 'Home'}
            fromRelative={storyReturn === 'relative'}
            onBack={() => {
              if (storyReturn === 'relative') {
                setTab('people')
                setScreen('relative')
                pushPath(`/people/${relative.id}`)
              } else {
                setTab('home')
                setScreen('home')
                pushPath('/home')
              }
            }}
            onEdit={() => openEditStory(story)}
            onDelete={async () => {
              await store.deleteStory(story.id)
              await refreshLibrary()
              if (storyReturn === 'relative') {
                setTab('people')
                setScreen('relative')
                setStoryId(null)
                pushPath(`/people/${relative.id}`)
              } else {
                setTab('home')
                setScreen('home')
                setRelativeId(null)
                setStoryId(null)
                pushPath('/home')
              }
            }}
          />
        )}
        {screen === 'story' && userId && (!relative || !story) && (
          <NotFoundScreen onHome={goHome} />
        )}
        {screen === 'write' && userId && (
          <WriteScreen
            relatives={relatives}
            prompt={writePrompt}
            presetRelativeId={relativeId}
            editing={editingStoryId ? stories.find((item) => item.id === editingStoryId) : undefined}
            backLabel={
              editingStoryId
                ? 'Story'
                : relative
                  ? relative.name
                  : 'Home'
            }
            onCancel={() => {
              if (editingStoryId) {
                setScreen('story')
                pushPath(`/stories/${editingStoryId}`)
                return
              }
              if (relativeId && relatives.some((item) => item.id === relativeId)) {
                setTab('people')
                setScreen('relative')
                pushPath(`/people/${relativeId}`)
                return
              }
              setTab('home')
              setScreen('home')
              pushPath('/home')
            }}
            onSaved={async (saved) => {
              await refreshLibrary()
              setStoryId(saved.id)
              setRelativeId(saved.relativeId)
              setEditingStoryId(null)
              setStoryReturn(tab === 'home' ? 'home' : 'relative')
              setScreen('story')
              pushPath(`/stories/${saved.id}`)
            }}
            onRefreshRelatives={refreshLibrary}
          />
        )}
        {screen === 'settings' && session && (
          <SettingsScreen
            displayName={session.displayName}
            email={session.email}
            onSignOut={async () => {
              await store.signOut()
              setSession(null)
              setRelatives([])
              setStories([])
              setScreen('welcome')
              replacePath('/')
            }}
          />
        )}

        {showMobileTabs && <TabBar tab={tab} onTab={goTab} />}
      </div>
    </div>
  )
}

function DesktopNav({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <header className="mvp-desktop-nav">
      <div className="mvp-desktop-nav-inner">
        <BrandLogo />
        <nav className="mvp-desktop-links">
          <button type="button" className={tab === 'home' ? 'active' : ''} onClick={() => onTab('home')}>Home</button>
          <button type="button" className={tab === 'people' ? 'active' : ''} onClick={() => onTab('people')}>People</button>
          <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => onTab('settings')}>Settings</button>
        </nav>
      </div>
    </header>
  )
}

function TabBar({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const tabIndex = tab === 'home' ? 0 : tab === 'people' ? 1 : 2

  return (
    <nav className="mvp-tabs" aria-label="Main navigation">
      <div className="mvp-tabs-glass-sheen" />
      <div
        className="mvp-tab-liquid-slider"
        style={{ transform: `translateX(${tabIndex * 100}%)` }}
      >
        <div className="mvp-tab-liquid-lens" />
      </div>
      <button
        type="button"
        className={`mvp-tab${tab === 'home' ? ' active' : ''}`}
        onClick={() => onTab('home')}
        aria-current={tab === 'home' ? 'page' : undefined}
      >
        <span className="mvp-tab-icon-wrap">
          <Home aria-hidden="true" strokeWidth={tab === 'home' ? 2.25 : 1.75} />
        </span>
        <span className="mvp-tab-label">Home</span>
      </button>
      <button
        type="button"
        className={`mvp-tab${tab === 'people' ? ' active' : ''}`}
        onClick={() => onTab('people')}
        aria-current={tab === 'people' ? 'page' : undefined}
      >
        <span className="mvp-tab-icon-wrap">
          <Users aria-hidden="true" strokeWidth={tab === 'people' ? 2.25 : 1.75} />
        </span>
        <span className="mvp-tab-label">People</span>
      </button>
      <button
        type="button"
        className={`mvp-tab${tab === 'settings' ? ' active' : ''}`}
        onClick={() => onTab('settings')}
        aria-current={tab === 'settings' ? 'page' : undefined}
      >
        <span className="mvp-tab-icon-wrap">
          <Settings aria-hidden="true" strokeWidth={tab === 'settings' ? 2.25 : 1.75} />
        </span>
        <span className="mvp-tab-label">Settings</span>
      </button>
    </nav>
  )
}

function WelcomeScreen({
  onLogin,
  onSignup,
}: {
  onLogin: () => void
  onSignup: () => void
}) {
  return (
    <div className="auth-welcome">
      <div className="auth-welcome-hero">
        <div className="auth-hero-illustration" aria-hidden="true">
          <img src={welcomeHeroUrl} alt="" className="auth-welcome-img" decoding="async" />
        </div>
      </div>
      <div className="auth-welcome-body">
        <BrandLogo />
        <h1 className="auth-welcome-title">Preserve what matters</h1>
        <p className="auth-welcome-subtitle">Capture and keep the stories of the people you love.</p>
        <div className="auth-welcome-actions">
          <button className="mvp-btn mvp-btn-primary mvp-btn-block" onClick={onSignup} id="welcome-signup-btn">
            Sign up
          </button>
          <button className="mvp-btn mvp-btn-ghost mvp-btn-block" onClick={onLogin} id="welcome-login-btn">
            Log in
          </button>
        </div>
      </div>
    </div>
  )
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen">
      <div className="auth-desktop-panel" aria-hidden="true">
        <div className="auth-hero-illustration">
          <img src={authFamilyUrl} alt="" className="auth-desktop-img" decoding="async" />
        </div>
      </div>
      <div className="auth-card">{children}</div>
    </div>
  )
}

function AuthScreen({
  mode,
  onDone,
  onSwitch,
  onForgotPassword,
  redirectPath,
  initialEmail,
  initialNotice,
}: {
  mode: 'login' | 'signup'
  onDone: (isNew: boolean) => void | Promise<void>
  onSwitch: (options?: { email?: string; notice?: string }) => void
  onForgotPassword?: (email: string) => void
  redirectPath: string | null
  initialEmail: string
  initialNotice: string
}) {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(initialNotice)
  const [busy, setBusy] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const destinationLabel = redirectPath?.startsWith('/stories/')
    ? 'that story'
    : redirectPath?.startsWith('/people')
      ? 'that page'
      : redirectPath?.startsWith('/settings')
        ? 'your account'
        : 'that page'
  const canSubmit =
    mode === 'signup'
      ? Boolean(email.includes('@') && password.length >= 6)
      : Boolean(email.trim() && password)

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  useEffect(() => {
    setNotice(initialNotice)
  }, [initialNotice])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        const result = await store.signup(email, password)
        if (!result.ok) {
          setError(result.error)
          return
        }
        if (result.needsConfirmation) {
          setConfirmationEmail(email.trim())
          setNotice('')
          return
        }
        await onDone(true)
        return
      }
      const result = await store.login(email, password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      await onDone(false)
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmedEmail() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        await onDone(true)
        return
      }
      onSwitch({
        email: confirmationEmail,
        notice: 'Email confirmed. Log in to continue.',
      })
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function resendConfirmation() {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await store.resendSignupConfirmation(confirmationEmail)
      setNotice(`We sent another email to ${confirmationEmail}.`)
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
        {mode === 'signup' && confirmationEmail ? (
          <div className="auth-confirm">
            <div className="auth-heading">
              <h1 className="auth-title">Check your email</h1>
              <p className="auth-lede">
                Open the message we sent to {confirmationEmail} to finish signing up.
              </p>
              <p className="auth-lede">
                After you confirm, come back here and log in to keep going.
              </p>
            </div>
            {error && <p className="mvp-error">{error}</p>}
            {notice && <p className="mvp-notice">{notice}</p>}
            <div className="auth-confirm-actions">
              <button className="mvp-btn mvp-btn-primary mvp-btn-block auth-submit" type="button" onClick={() => void handleConfirmedEmail()} disabled={busy}>
                {busy ? 'Checking…' : 'I confirmed my email'}
              </button>
              <button
                className="mvp-btn mvp-btn-ghost mvp-btn-block"
                type="button"
                onClick={() => {
                  setConfirmationEmail('')
                  setError('')
                  setNotice('')
                }}
                disabled={busy}
              >
                Use a different email
              </button>
            </div>
            <button className="mvp-switch auth-switch" type="button" onClick={() => void resendConfirmation()} disabled={busy}>
              <span className="auth-switch-link">Send again</span>
            </button>
          </div>
        ) : (
          <>
            <div className="auth-heading">
              <h1 className="auth-title">
                {mode === 'login' ? 'Welcome back' : 'Sign up'}
              </h1>
              <p className="auth-lede">
                {mode === 'login'
                  ? redirectPath
                    ? `Log in to open ${destinationLabel}.`
                    : 'Continue the stories you are keeping.'
                  : redirectPath
                    ? `Sign up, then we'll take you to ${destinationLabel}.`
                    : 'Save stories about people you love.'}
              </p>
            </div>
            <form onSubmit={(event) => void submit(event)} className="auth-form">
              <div className="mvp-field">
                <label className="mvp-label" htmlFor={`auth-email-${mode}`}>
                  Email
                </label>
                <input
                  id={`auth-email-${mode}`}
                  className="mvp-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="mvp-field">
                <label className="mvp-label" htmlFor={`auth-password-${mode}`}>Password</label>
                <div className="mvp-input-wrapper">
                  <input
                    id={`auth-password-${mode}`}
                    className="mvp-input with-reveal"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={mode === 'signup' ? 6 : undefined}
                  />
                  <button
                    type="button"
                    className="mvp-input-reveal"
                    onClick={() => setShowPassword((open) => !open)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="mvp-field-hint">At least 6 characters</p>
                )}
                {mode === 'login' && onForgotPassword && (
                  <button
                    type="button"
                    className="mvp-field-link"
                    onClick={() => onForgotPassword(email.trim())}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              {error && <p className="mvp-error">{error}</p>}
              {notice && <p className="mvp-notice">{notice}</p>}
              <button
                className="mvp-btn mvp-btn-primary mvp-btn-block auth-submit"
                type="submit"
                id={`auth-submit-${mode}`}
                disabled={busy || !canSubmit}
              >
                {busy ? (mode === 'login' ? 'Logging in…' : 'Signing up…') : mode === 'login' ? 'Log in' : 'Sign up'}
              </button>
            </form>
            <button className="mvp-switch auth-switch" type="button" onClick={() => onSwitch({ email: email.trim() })}>
              {mode === 'login'
                ? <>No account yet? <span className="auth-switch-link">Sign up</span></>
                : <>Already have an account? <span className="auth-switch-link">Log in</span></>}
            </button>
          </>
        )}
    </AuthShell>
  )
}

function ForgotPasswordScreen({
  initialEmail,
  onBack,
}: {
  initialEmail: string
  onBack: (email: string) => void
}) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const canSubmit = Boolean(email.trim().includes('@'))

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await store.requestPasswordReset(email)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSentTo(email.trim())
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError('')
    setBusy(true)
    try {
      const result = await store.requestPasswordReset(sentTo)
      if (!result.ok) {
        setError(result.error)
        return
      }
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
        {sentTo ? (
          <div className="auth-confirm">
            <div className="auth-heading">
              <h1 className="auth-title">Check your email</h1>
              <p className="auth-lede">
                If an account exists for {sentTo}, we sent a link to reset your password.
              </p>
              <p className="auth-lede">
                Open the link on this device, then choose a new password.
              </p>
            </div>
            {error && <p className="mvp-error">{error}</p>}
            <div className="auth-confirm-actions">
              <button
                className="mvp-btn mvp-btn-primary mvp-btn-block auth-submit"
                type="button"
                onClick={() => onBack(sentTo)}
                disabled={busy}
              >
                Back to log in
              </button>
              <button
                className="mvp-btn mvp-btn-ghost mvp-btn-block"
                type="button"
                onClick={() => {
                  setSentTo('')
                  setError('')
                }}
                disabled={busy}
              >
                Use a different email
              </button>
            </div>
            <button className="mvp-switch auth-switch" type="button" onClick={() => void resend()} disabled={busy}>
              <span className="auth-switch-link">Send again</span>
            </button>
          </div>
        ) : (
          <>
            <div className="auth-heading">
              <h1 className="auth-title">Reset password</h1>
              <p className="auth-lede">Enter your email and we&apos;ll send a reset link.</p>
            </div>
            <form onSubmit={(event) => void submit(event)} className="auth-form">
              <div className="mvp-field">
                <label className="mvp-label" htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  className="mvp-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {error && <p className="mvp-error">{error}</p>}
              <button
                className="mvp-btn mvp-btn-primary mvp-btn-block auth-submit"
                type="submit"
                disabled={busy || !canSubmit}
              >
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <button className="mvp-switch auth-switch" type="button" onClick={() => onBack(email.trim())}>
              Remember it? <span className="auth-switch-link">Log in</span>
            </button>
          </>
        )}
    </AuthShell>
  )
}

function ResetPasswordScreen({
  hasSession,
  onDone,
  onRequestNewLink,
}: {
  hasSession: boolean
  onDone: () => void | Promise<void>
  onRequestNewLink: () => void
}) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const canSubmit = password.length >= 6

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await store.updatePassword(password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      await onDone()
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  if (!hasSession) {
    return (
      <AuthShell>
          <div className="auth-heading">
            <h1 className="auth-title">Link expired</h1>
            <p className="auth-lede">
              That reset link is no longer valid. Request a new one to choose a new password.
            </p>
          </div>
          <button className="mvp-btn mvp-btn-primary mvp-btn-block auth-submit" type="button" onClick={onRequestNewLink}>
            Request a new link
          </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
        <div className="auth-heading">
          <h1 className="auth-title">Choose a new password</h1>
          <p className="auth-lede">Then you can keep going with your stories.</p>
        </div>
        <form onSubmit={(event) => void submit(event)} className="auth-form">
          <div className="mvp-field">
            <label className="mvp-label" htmlFor="reset-password">
              New password
            </label>
            <div className="mvp-input-wrapper">
              <input
                id="reset-password"
                className="mvp-input with-reveal"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                autoFocus
              />
              <button
                type="button"
                className="mvp-input-reveal"
                onClick={() => setShowPassword((open) => !open)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </button>
            </div>
            <p className="mvp-field-hint">At least 6 characters</p>
          </div>
          {error && <p className="mvp-error">{error}</p>}
          <button
            className="mvp-btn mvp-btn-primary mvp-btn-block auth-submit"
            type="submit"
            disabled={busy || !canSubmit}
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
    </AuthShell>
  )
}

function OnboardingProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mvp-onboard-progress-wrap">
      <div
        className="mvp-onboard-progress"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={3}
        aria-label={`Step ${step} of 3`}
      >
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={[
              'mvp-onboard-progress-seg',
              segment < step ? 'filled' : '',
              segment === step ? 'current' : '',
            ].filter(Boolean).join(' ')}
          />
        ))}
      </div>
      <span className="mvp-onboard-progress-label" aria-hidden="true">
        Step {step} of 3
      </span>
    </div>
  )
}

function OnboardingIntro({
  onContinue,
  onSkip,
}: {
  onContinue: () => void
  onSkip: () => void
}) {
  return (
    <div className="mvp-onboard">
      <header className="mvp-top mvp-top-brand mvp-top-onboard">
        <BrandLogo />
      </header>
      <main className="mvp-body mvp-onboard-body mvp-onboard-intro">
        <div className="mvp-illust-medium">
          <img src={readingIllustrationUrl} alt="" decoding="async" />
        </div>
        <h1 className="mvp-h1">Start with one story</h1>
        <p className="mvp-lede">Preserve one story you want your family to remember.</p>
        <ol className="mvp-steps">
          <li className="mvp-step">
            <span className="mvp-step-n" aria-hidden="true">1</span>
            <p>Name someone you want to remember</p>
          </li>
          <li className="mvp-step">
            <span className="mvp-step-n" aria-hidden="true">2</span>
            <p>Write the story as you know it</p>
          </li>
          <li className="mvp-step">
            <span className="mvp-step-n" aria-hidden="true">3</span>
            <p>Keep it with the rest of your family</p>
          </li>
        </ol>
      </main>
      <footer className="mvp-onboard-footer">
        <button className="mvp-btn mvp-btn-primary mvp-btn-block mvp-btn-lg" type="button" onClick={onContinue}>
          Continue
        </button>
        <div className="mvp-skip">
          <button className="mvp-switch" type="button" onClick={onSkip}>
            Go to Home instead
          </button>
        </div>
      </footer>
    </div>
  )
}

function OnboardingName({
  initialName,
  onBack,
  onContinue,
  onSkip,
}: {
  initialName: string
  onBack: () => void
  onContinue: () => void | Promise<void>
  onSkip: () => void
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const pendingLeaveAction = useRef<(() => void | Promise<void>) | null>(null)
  const canContinue = Boolean(name.trim())
  const isDirty = name.trim() !== initialName.trim()

  useBeforeUnloadWhen(isDirty)

  function requestLeave(action: () => void | Promise<void>) {
    if (!isDirty || busy) {
      void action()
      return
    }
    pendingLeaveAction.current = action
    setConfirmingLeave(true)
  }

  function keepEditing() {
    pendingLeaveAction.current = null
    setConfirmingLeave(false)
  }

  function discardDraft() {
    const nextAction = pendingLeaveAction.current
    pendingLeaveAction.current = null
    setConfirmingLeave(false)
    if (nextAction) void nextAction()
  }

  async function continueOnboarding() {
    if (!name.trim()) {
      setError('Add your name to continue.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await store.updateDisplayName(name.trim())
      await onContinue()
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mvp-onboard">
      <header className="mvp-top mvp-top-onboard">
        <OnboardingProgress step={1} />
        <BackControl onClick={() => requestLeave(onBack)} />
      </header>
      <main className="mvp-body mvp-onboard-body mvp-onboard-form mvp-onboard-form-single">
        <h1 className="mvp-h1">What&apos;s your name?</h1>
        <p className="mvp-lede mvp-onboard-form-lede">
          So your family knows who saved these stories.
        </p>
        <input
          id="onboarding-name"
          className={`mvp-input mvp-onboard-name-input${error ? ' mvp-input-error' : ''}`}
          value={name}
          onChange={(event) => { setName(event.target.value); setError('') }}
          placeholder="Your name"
          autoComplete="name"
          autoFocus
          enterKeyHint="done"
          aria-label="Your name"
          aria-required="true"
        />
        {error && <p className="mvp-error">{error}</p>}
        <button
          className="mvp-btn mvp-btn-primary mvp-btn-block mvp-btn-lg mvp-onboard-form-submit"
          type="button"
          onClick={() => void continueOnboarding()}
          disabled={busy || !canContinue}
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
        <div className="mvp-skip">
          <button className="mvp-switch" type="button" onClick={() => requestLeave(onSkip)}>
            Skip for now
          </button>
        </div>
      </main>
      <LeaveConfirm open={confirmingLeave} onStay={keepEditing} onDiscard={discardDraft} />
    </div>
  )
}

function OnboardingRelative({
  existing,
  onBack,
  onContinue,
  onSkip,
}: {
  existing: Relative | null
  onBack: () => void
  onContinue: (relativeId: string) => void | Promise<void>
  onSkip: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [relationship, setRelationship] = useState(existing?.relationship ?? '')
  const [nameError, setNameError] = useState('')
  const [relationshipError, setRelationshipError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const pendingLeaveAction = useRef<(() => void | Promise<void>) | null>(null)
  const canContinue = Boolean(name.trim() && relationship.trim())
  const initialName = existing?.name ?? ''
  const initialRelationship = existing?.relationship ?? ''
  const isDirty =
    name.trim() !== initialName.trim() ||
    relationship.trim() !== initialRelationship.trim()

  useBeforeUnloadWhen(isDirty)

  function requestLeave(action: () => void | Promise<void>) {
    if (!isDirty || busy) {
      void action()
      return
    }
    pendingLeaveAction.current = action
    setConfirmingLeave(true)
  }

  function keepEditing() {
    pendingLeaveAction.current = null
    setConfirmingLeave(false)
  }

  function discardDraft() {
    const nextAction = pendingLeaveAction.current
    pendingLeaveAction.current = null
    setConfirmingLeave(false)
    if (nextAction) void nextAction()
  }

  async function continueOnboarding() {
    let hasError = false
    if (!name.trim()) {
      setNameError('Add their name before saving.')
      hasError = true
    }
    if (!relationship.trim()) {
      setRelationshipError('Add their relationship to you before saving.')
      hasError = true
    }
    if (hasError) return

    setBusy(true)
    setSaveError('')
    try {
      const saved = await store.saveRelative({
        id: existing?.id,
        name: name.trim(),
        relationship: relationship.trim(),
      })
      await onContinue(saved.id)
    } catch (error) {
      setSaveError(messageFromError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mvp-onboard">
      <header className="mvp-top mvp-top-onboard">
        <OnboardingProgress step={2} />
        <BackControl onClick={() => requestLeave(onBack)} />
      </header>
      <main className="mvp-body mvp-onboard-body mvp-onboard-form">
        <h1 className="mvp-h1">Who would you like to remember?</h1>
        <p className="mvp-lede mvp-onboard-form-lede">
          This helps you organize stories by person. Start with someone special.
        </p>
        <label className="mvp-field">
          <span className="mvp-label">
            Their name <span className="mvp-required">(required)</span>
          </span>
          <input
            className="mvp-input"
            value={name}
            onChange={(event) => { setName(event.target.value); setNameError('') }}
            placeholder="Eleanor"
            autoComplete="name"
            enterKeyHint="next"
          />
          {nameError && <p className="mvp-error">{nameError}</p>}
        </label>
        <RelationshipField
          value={relationship}
          onChange={(val) => { setRelationship(val); setRelationshipError('') }}
          error={relationshipError}
          required
        />
        {saveError && <p className="mvp-error">{saveError}</p>}
      </main>
      <footer className="mvp-onboard-footer">
        <button
          className="mvp-btn mvp-btn-primary mvp-btn-block mvp-btn-lg"
          onClick={() => void continueOnboarding()}
          disabled={busy || !canContinue}
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
        <div className="mvp-skip">
          <button className="mvp-switch" type="button" onClick={() => requestLeave(onSkip)}>
            Skip for now
          </button>
        </div>
      </footer>
      <LeaveConfirm open={confirmingLeave} onStay={keepEditing} onDiscard={discardDraft} />
    </div>
  )
}

function OnboardingStory({
  relative,
  onBack,
  onSaved,
  onSkip,
}: {
  relative: Relative
  onBack: () => void
  onSaved: () => void | Promise<void>
  onSkip: () => void
}) {
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * HOME_PROMPTS.length))
  const draftKey = storyDraftKey('onboarding', { relativeId: relative.id })
  const [text, setText] = useState(() => loadDraft(draftKey))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const pendingLeaveAction = useRef<(() => void | Promise<void>) | null>(null)
  const prompt = HOME_PROMPTS[promptIndex % HOME_PROMPTS.length]
  const canSave = Boolean(text.trim())
  const isDirty = Boolean(text.trim())

  useBeforeUnloadWhen(isDirty)

  useEffect(() => {
    saveDraft(draftKey, text)
  }, [draftKey, text])

  function requestLeave(action: () => void | Promise<void>) {
    if (!isDirty || busy) {
      void action()
      return
    }
    pendingLeaveAction.current = action
    setConfirmingLeave(true)
  }

  function keepEditing() {
    pendingLeaveAction.current = null
    setConfirmingLeave(false)
  }

  function discardDraft() {
    clearDraft(draftKey)
    const nextAction = pendingLeaveAction.current
    pendingLeaveAction.current = null
    setConfirmingLeave(false)
    if (nextAction) void nextAction()
  }

  async function save() {
    if (!text.trim()) {
      setError('Write something you want to remember before saving.')
      return
    }
    setBusy(true)
    try {
      await store.saveStory({
        relativeId: relative.id,
        title: prompt.trim(),
        prompt: '',
        text: text.trim(),
      })
      clearDraft(draftKey)
      await onSaved()
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mvp-onboard">
      <header className="mvp-top mvp-top-onboard">
        <OnboardingProgress step={3} />
        <BackControl onClick={() => requestLeave(onBack)} />
      </header>
      <main className="mvp-body mvp-onboard-body mvp-onboard-form">
        <h1 className="mvp-h1">What do you want to remember about {relative.name}?</h1>
        <p className="mvp-lede mvp-onboard-form-lede">
          Even a few sentences is enough. You can always add more later.
        </p>
        <section className="mvp-prompt-card mvp-onboard-prompt">
          <p className="mvp-quote">"{prompt}"</p>
          <button
            className="mvp-btn mvp-btn-ghost"
            type="button"
            onClick={() => setPromptIndex((value) => value + 1)}
          >
            Swap
          </button>
        </section>
        <div className="mvp-field">
          <div className="mvp-story-field-head">
            <span className="mvp-label">
              Their story <span className="mvp-required">(required)</span>
            </span>
            <DictateControl
              onTranscript={(spoken) => {
                setText((current) => {
                  const glue = current.trim() ? (current.endsWith('\n') ? '' : ' ') : ''
                  return `${current}${glue}${spoken}`
                })
                setError('')
              }}
            />
          </div>
          <textarea
            className={`mvp-textarea mvp-onboard-story${error ? ' mvp-input-error' : ''}`}
            value={text}
            onChange={(event) => { setText(event.target.value); setError('') }}
            placeholder={`Write what you remember about ${relative.name}...`}
          />
          {error && <p className="mvp-error">{error}</p>}
        </div>
      </main>
      <footer className="mvp-onboard-footer">
        <button
          className="mvp-btn mvp-btn-primary mvp-btn-block mvp-btn-lg"
          onClick={() => void save()}
          disabled={busy || !canSave}
        >
          {busy ? 'Saving…' : 'Save story'}
        </button>
        <div className="mvp-skip">
          <button className="mvp-switch" type="button" onClick={() => requestLeave(onSkip)}>
            Skip for now
          </button>
        </div>
      </footer>
      <LeaveConfirm open={confirmingLeave} onStay={keepEditing} onDiscard={discardDraft} />
    </div>
  )
}

function HomeScreen({
  prompt,
  stories,
  relatives,
  onSwap,
  onWrite,
  onFreeWrite,
  onOpenStory,
}: {
  prompt: string
  stories: Story[]
  relatives: Relative[]
  onSwap: () => void
  onWrite: () => void
  onFreeWrite: () => void
  onOpenStory: (id: string) => void
}) {
  return (
    <>
      <main className="mvp-body mvp-home mvp-tab-screen">
        <section className="mvp-prompt-card">
          <p className="mvp-quote">&ldquo;{prompt}&rdquo;</p>
          <div className="mvp-prompt-actions">
            <button className="mvp-btn mvp-btn-ghost" type="button" onClick={onSwap}>Swap</button>
            <button className="mvp-btn mvp-btn-primary" type="button" onClick={onWrite}>Answer</button>
            <button className="mvp-btn mvp-btn-secondary mvp-btn-block" type="button" onClick={onFreeWrite}>Write without a prompt</button>
          </div>
        </section>
        <section className="mvp-feed">
          {stories.length > 0 && <h2 className="mvp-section-label">Recent entries</h2>}
          {stories.length === 0 && (
            <EmptyState
              variant="soft"
              illustration={journalIllustrationUrl}
              body="Your stories will live here."
            />
          )}
          {stories.map((item) => {
            const person = relatives.find((relative) => relative.id === item.relativeId)
            const headline = item.title.trim() || item.prompt.trim()

            return (
              <button key={item.id} className="mvp-entry" onClick={() => onOpenStory(item.id)}>
                <div className="mvp-entry-top">
                  <span className="mvp-entry-name">{person?.name ?? 'Someone'}</span>
                  <span className="mvp-entry-date">{formatDate(item.createdAt)}</span>
                </div>
                {headline && <p className="mvp-entry-kicker">“{headline}”</p>}
                <p className="mvp-entry-snippet">{snippet(item.text)}</p>
              </button>
            )
          })}
        </section>
      </main>
    </>
  )
}

function RelativeFormScreen({
  relative,
  onBack,
  onSaved,
}: {
  relative?: Relative
  onBack: () => void
  onSaved: (relativeId: string) => void | Promise<void>
}) {
  const isEditing = Boolean(relative)
  const [name, setName] = useState(relative?.name ?? '')
  const [relationship, setRelationship] = useState(relative?.relationship ?? '')
  const [nameError, setNameError] = useState('')
  const [relationshipError, setRelationshipError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const canSave = Boolean(name.trim() && relationship.trim())

  async function save() {
    let hasError = false
    if (!name.trim()) {
      setNameError('Add their name before saving.')
      hasError = true
    }
    if (!relationship.trim()) {
      setRelationshipError('Add their relationship to you before saving.')
      hasError = true
    }
    if (hasError) return

    setBusy(true)
    setSaveError('')
    try {
      const saved = await store.saveRelative({
        id: relative?.id,
        name: name.trim(),
        relationship: relationship.trim(),
      })
      await onSaved(saved.id)
    } catch (error) {
      setSaveError(messageFromError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="mvp-top mvp-top-form">
        <BackControl onClick={onBack} label={isEditing && relative ? personLabel(relative) : 'People'} />
      </header>
      <main className="mvp-body mvp-page mvp-tab-screen">
        <h1 className="mvp-h1">{isEditing ? 'Edit' : 'Add someone'}</h1>
        <p className="mvp-lede mvp-page-form-lede">
          {isEditing ? 'Update their name or relationship.' : 'Who would you like to remember?'}
        </p>
        <div className="mvp-grouped-section">
          <div className="mvp-grouped-card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <label className="mvp-field">
              <span className="mvp-label">
                Their name <span className="mvp-required">(required)</span>
              </span>
              <input
                className="mvp-input"
                value={name}
                onChange={(event) => { setName(event.target.value); setNameError('') }}
                placeholder="Eleanor"
                autoComplete="name"
                autoFocus
                enterKeyHint="next"
              />
              {nameError && <p className="mvp-error">{nameError}</p>}
            </label>
            <RelationshipField
              value={relationship}
              onChange={(val) => { setRelationship(val); setRelationshipError('') }}
              error={relationshipError}
              required
            />
          </div>
        </div>
        {saveError && <p className="mvp-error">{saveError}</p>}
        <button
          className="mvp-btn mvp-btn-primary mvp-btn-block mvp-btn-lg"
          type="button"
          onClick={() => void save()}
          disabled={busy || !canSave}
        >
          {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Save person'}
        </button>
      </main>
    </>
  )
}

function PeopleScreen({
  relatives,
  stories,
  onOpen,
  onAddPerson,
}: {
  relatives: Relative[]
  stories: Story[]
  onOpen: (id: string) => void
  onAddPerson: () => void
}) {
  return (
    <>
      <main className={`mvp-body mvp-page mvp-tab-screen${relatives.length > 0 ? ' mvp-page-with-add-float' : ''}`}>
        <div className="mvp-page-head mvp-page-head-start">
          <div className="mvp-page-head-copy">
            <h1 className="mvp-h1">People</h1>
            <p className="mvp-lede">The relatives whose stories you are keeping.</p>
          </div>
          {relatives.length > 0 && (
            <button
              type="button"
              className="mvp-page-add-btn"
              onClick={onAddPerson}
              aria-label="Add someone"
            >
              <Plus aria-hidden="true" />
            </button>
          )}
        </div>
        {relatives.length === 0 && (
          <EmptyState
            illustration={peopleIllustrationUrl}
            title="Who comes to mind?"
            body="Start with one person whose stories you want to keep."
            action={{ label: 'Add someone', onClick: onAddPerson }}
          />
        )}
        <div className="mvp-card-grid">
          {relatives.map((person) => {
            const count = stories.filter((item) => item.relativeId === person.id).length
            return (
              <button key={person.id} className="mvp-person" onClick={() => onOpen(person.id)}>
                <div className="mvp-person-copy">
                  <span className="mvp-person-name">{person.name}</span>
                  {person.relationship && <p className="mvp-person-meta mvp-person-rel">{person.relationship}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className="mvp-person-meta">{count === 1 ? '1 story' : `${count} stories`}</span>
                  <ChevronRight aria-hidden="true" style={{ width: 18, height: 18, color: 'var(--quiet)' }} />
                </div>
              </button>
            )
          })}
        </div>
      </main>
      {relatives.length > 0 && (
        <div className="mvp-people-add-float">
          <button type="button" className="mvp-btn mvp-btn-primary mvp-btn-block mvp-btn-lg" onClick={onAddPerson}>
            <Plus aria-hidden="true" />
            Add someone
          </button>
        </div>
      )}
    </>
  )
}

function RelativeScreen({
  relative,
  stories,
  onBack,
  onOpenStory,
  onWrite,
  onEdit,
  onDelete,
}: {
  relative: Relative
  stories: Story[]
  onBack: () => void
  onOpenStory: (id: string) => void
  onWrite: () => void
  onEdit: () => void
  onDelete: () => void | Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasStories = stories.length > 0
  const storyCount = stories.length
  const removeLabel = storyCount === 1 ? '1 story' : `${storyCount} stories`

  function openRemoveConfirm() {
    setMenuOpen(false)
    setConfirming(true)
  }

  function openEdit() {
    setMenuOpen(false)
    onEdit()
  }

  return (
    <>
      <header className="mvp-top mvp-top-with-menu">
        <BackControl onClick={onBack} label="People" />
        <button
          type="button"
          className="mvp-top-more-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="More options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreHorizontal aria-hidden="true" />
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              className="mvp-menu-backdrop"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div className="mvp-top-menu" role="menu">
              <button type="button" role="menuitem" className="mvp-top-menu-item" onClick={openEdit}>
                Edit
              </button>
              <div className="mvp-top-menu-divider" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="mvp-top-menu-item mvp-top-menu-item-danger"
                onClick={openRemoveConfirm}
              >
                Remove
              </button>
            </div>
          </>
        )}
      </header>
      <main
        className={[
          'mvp-body',
          'mvp-page',
          'mvp-relative-page',
          hasStories ? 'mvp-page-with-add-float' : 'mvp-relative-empty',
        ].join(' ')}
      >
        <div className="mvp-page-head">
          <div className="mvp-page-head-copy">
            <h1 className="mvp-h1">{personLabel(relative)}</h1>
          </div>
          {hasStories && (
            <button
              type="button"
              className="mvp-page-add-btn"
              onClick={onWrite}
              aria-label="Write a story"
            >
              <PenLine aria-hidden="true" />
            </button>
          )}
        </div>
        {!hasStories && (
          <div className="mvp-relative-empty-state-wrap">
            <EmptyState
              variant="soft"
              illustration={journalIllustrationUrl}
              title={`No stories about ${relative.name} yet`}
              body="Write the first story you want your family to keep."
              action={{ label: 'Write a story', onClick: onWrite }}
            />
          </div>
        )}
        {hasStories && (
          <div className="mvp-card-grid mvp-relative-stories-grid">
              {stories.map((item) => (
                  <button key={item.id} className="mvp-entry mvp-relative-story-card" onClick={() => onOpenStory(item.id)}>
                    <div className="mvp-entry-top">
                      <span className="mvp-entry-heading">{storyDisplayTitle(item, relative)}</span>
                      <span className="mvp-entry-date">{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="mvp-entry-snippet">{snippet(item.text)}</p>
                  </button>
              ))}
          </div>
        )}

        {confirming && (
          <div className="mvp-modal-backdrop" onClick={() => setConfirming(false)}>
            <div className="mvp-modal-card" onClick={(event) => event.stopPropagation()}>
              <h2 className="mvp-modal-title">Remove this person?</h2>
              <p className="mvp-modal-msg">
                This will permanently remove this person and {removeLabel}. That can&apos;t be undone.
              </p>
              <div className="mvp-modal-actions">
                <button className="mvp-btn mvp-btn-ghost" type="button" onClick={() => setConfirming(false)}>
                  Keep them
                </button>
                <button
                  className="mvp-btn mvp-btn-danger"
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    void (async () => {
                      setIsDeleting(true)
                      try {
                        await onDelete()
                        setConfirming(false)
                      } catch {
                        setIsDeleting(false)
                      }
                    })()
                  }}
                >
                  {isDeleting ? 'Removing…' : 'Remove person'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {hasStories && (
        <div className="mvp-people-add-float">
          <button type="button" className="mvp-btn mvp-btn-primary mvp-btn-block mvp-btn-lg" onClick={onWrite}>
            <PenLine aria-hidden="true" />
            Write a story
          </button>
        </div>
      )}
    </>
  )
}

function storyDisplayTitle(story: Story, relative: Relative) {
  if (story.title?.trim()) return story.title.trim()
  if (story.prompt?.trim()) return story.prompt.trim()
  const words = story.text.trim().split(/\s+/).slice(0, 8).join(' ')
  if (!words) return relative.name
  return words.length > 48 ? `${words.slice(0, 48).trim()}…` : words
}

function StoryScreen({
  relative,
  story,
  backLabel,
  fromRelative,
  onBack,
  onEdit,
  onDelete,
}: {
  relative: Relative
  story: Story
  backLabel: string
  fromRelative: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void | Promise<void>
}) {
  const displayTitle = storyDisplayTitle(story, relative)
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  function openDeleteConfirm() {
    setMenuOpen(false)
    setConfirming(true)
  }

  function openEdit() {
    setMenuOpen(false)
    onEdit()
  }

  return (
    <>
      <header className="mvp-top mvp-top-with-menu">
        <BackControl onClick={onBack} label={backLabel} />
        <button
          type="button"
          className="mvp-top-more-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="More options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreHorizontal aria-hidden="true" />
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              className="mvp-menu-backdrop"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div className="mvp-top-menu" role="menu">
              <button type="button" role="menuitem" className="mvp-top-menu-item" onClick={openEdit}>
                Edit
              </button>
              <div className="mvp-top-menu-divider" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="mvp-top-menu-item mvp-top-menu-item-danger"
                onClick={openDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </header>
      <main className="mvp-body mvp-story-read">
        <article className="mvp-story-read-article">
          <header className="mvp-story-read-head">
            <h1 className="mvp-read-title">{displayTitle}</h1>
            <p className="mvp-read-meta">
              {fromRelative ? `Written ${formatDate(story.createdAt)}` : `${relative.name} · ${formatDate(story.createdAt)}`}
            </p>
          </header>
          <StoryListenRow text={story.text} />
          <p className="mvp-read-body">{story.text}</p>
        </article>

        {confirming && (
          <div className="mvp-modal-backdrop" onClick={() => setConfirming(false)}>
            <div className="mvp-modal-card" onClick={(e) => e.stopPropagation()}>
              <h2 className="mvp-modal-title">Delete story</h2>
              <p className="mvp-modal-msg">
                This will permanently delete this story. That can&apos;t be undone.
              </p>
              <div className="mvp-modal-actions">
                <button
                  className="mvp-btn mvp-btn-secondary"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </button>
                <button
                  className="mvp-btn mvp-btn-danger"
                  disabled={isDeleting}
                  onClick={() => {
                    void (async () => {
                      setIsDeleting(true)
                      try {
                        await onDelete()
                        setConfirming(false)
                      } catch {
                        setIsDeleting(false)
                      }
                    })()
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Delete story'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function WriteScreen({
  relatives,
  prompt,
  presetRelativeId,
  editing,
  backLabel,
  onCancel,
  onSaved,
  onRefreshRelatives,
}: {
  relatives: Relative[]
  prompt: string
  presetRelativeId: string | null
  editing?: Story
  backLabel: string
  onCancel: () => void
  onSaved: (story: Story) => void | Promise<void>
  onRefreshRelatives?: () => void | Promise<unknown>
}) {
  const isEditing = Boolean(editing)
  const presetPerson = relatives.find((person) => person.id === (editing?.relativeId ?? presetRelativeId)) ?? null
  const showPersonSelector = !presetPerson
  const draftKey = storyDraftKey('write', {
    storyId: editing?.id,
    relativeId: presetRelativeId,
    prompt,
  })

  const [selectedId, setSelectedId] = useState(
    editing?.relativeId ?? presetRelativeId ?? relatives[0]?.id ?? '',
  )
  const [addingNew, setAddingNew] = useState(relatives.length === 0 && !isEditing)
  const [newName, setNewName] = useState('')
  const [newRelationship, setNewRelationship] = useState('')
  const [titleValue, setTitleValue] = useState(
    editing?.title?.trim() || editing?.prompt?.trim() || prompt.trim() || '',
  )
  const [text, setText] = useState(() => loadDraft(draftKey) || (editing?.text ?? ''))
  const [nameError, setNameError] = useState('')
  const [relationshipError, setRelationshipError] = useState('')
  const [textError, setTextError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const pendingLeaveAction = useRef<(() => void | Promise<void>) | null>(null)

  const storyPerson = presetPerson ?? relatives.find((person) => person.id === selectedId) ?? null
  const storyPlaceholder = presetPerson
    ? 'Start writing…'
    : storyPerson
      ? `Write what you remember about ${storyPerson.name}...`
      : 'Write what you remember...'
  const initialSelectedId = editing?.relativeId ?? presetRelativeId ?? relatives[0]?.id ?? ''
  const initialTitle = editing?.title?.trim() || editing?.prompt?.trim() || prompt.trim() || ''
  const initialText = editing?.text ?? ''
  const initialAddingNew = relatives.length === 0 && !isEditing
  const isDirty =
    selectedId !== initialSelectedId ||
    addingNew !== initialAddingNew ||
    newName.trim() !== '' ||
    newRelationship.trim() !== '' ||
    titleValue.trim() !== initialTitle.trim() ||
    text !== initialText

  useBeforeUnloadWhen(isDirty)

  useEffect(() => {
    saveDraft(draftKey, text)
  }, [draftKey, text])

  function requestLeave(action: () => void | Promise<void>) {
    if (!isDirty || isSaving) {
      void action()
      return
    }
    pendingLeaveAction.current = action
    setConfirmingLeave(true)
  }

  function keepEditing() {
    pendingLeaveAction.current = null
    setConfirmingLeave(false)
  }

  function discardDraft() {
    clearDraft(draftKey)
    const nextAction = pendingLeaveAction.current
    pendingLeaveAction.current = null
    setConfirmingLeave(false)
    if (nextAction) void nextAction()
  }

  async function save() {
    if (!text.trim()) {
      setTextError('Write something you want to remember before saving.')
      return
    }

    let relativeId = isEditing ? selectedId : (presetPerson?.id ?? selectedId)
    if (addingNew || !relativeId) {
      if (!addingNew) {
        setNameError('Choose who this story is about before saving.')
        return
      }
      let hasError = false
      if (!newName.trim()) {
        setNameError('Add their name before saving.')
        hasError = true
      }
      if (!newRelationship.trim()) {
        setRelationshipError('Add their relationship to you before saving.')
        hasError = true
      }
      if (hasError) return

      setIsSaving(true)
      setSaveError('')
      try {
        const created = await store.saveRelative({
          name: newName.trim(),
          relationship: newRelationship.trim(),
        })
        relativeId = created.id
        await onRefreshRelatives?.()
      } catch (error) {
        setSaveError(messageFromError(error))
        setIsSaving(false)
        return
      }
    }

    setIsSaving(true)
    setSaveError('')
    try {
      const saved = await store.saveStory({
        id: editing?.id,
        relativeId,
        title: titleValue.trim(),
        prompt: '',
        text: text.trim(),
      })
      clearDraft(draftKey)
      await onSaved(saved)
    } catch (error) {
      setSaveError(messageFromError(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAddPerson() {
    let hasError = false
    if (!newName.trim()) {
      setNameError('Add their name before saving.')
      hasError = true
    }
    if (!newRelationship.trim()) {
      setRelationshipError('Add their relationship to you before saving.')
      hasError = true
    }
    if (hasError) return

    setSaveError('')
    try {
      const created = await store.saveRelative({
        name: newName.trim(),
        relationship: newRelationship.trim(),
      })
      await onRefreshRelatives?.()
      setSelectedId(created.id)
      setAddingNew(false)
      setNewName('')
      setNewRelationship('')
      setNameError('')
      setRelationshipError('')
    } catch (error) {
      setSaveError(messageFromError(error))
    }
  }

  function handleCancelAdd() {
    setAddingNew(false)
    setNewName('')
    setNewRelationship('')
    setNameError('')
    setRelationshipError('')
    if (relatives.length > 0) {
      if (!selectedId) setSelectedId(relatives[0]?.id ?? '')
    }
  }

  return (
    <div className="mvp-write-shell">
      <header className="mvp-top">
        <BackControl onClick={() => requestLeave(onCancel)} label={backLabel} />
      </header>
      <main className="mvp-body mvp-write-body">
        <h1 className="mvp-h1">{isEditing ? 'Edit story' : 'Add story'}</h1>
        {!isEditing && !storyPerson && (
          <p className="mvp-lede mvp-write-lede">Choose who it is about, then write what you remember.</p>
        )}

        <div className="mvp-write-main">
          {!isEditing && showPersonSelector && (
            <div className="mvp-write-person-selector">
              <span className="mvp-label">Who is this about?</span>
              {!addingNew && (
                <select
                  className="mvp-select"
                  value={selectedId}
                  onChange={(event) => {
                    if (event.target.value === 'new') {
                      setAddingNew(true)
                      setNameError('')
                    } else {
                      setSelectedId(event.target.value)
                      setNameError('')
                    }
                  }}
                >
                  {relatives.map((person) => (
                    <option key={person.id} value={person.id}>
                      {personLabel(person)}
                    </option>
                  ))}
                  <option value="new">+ Add someone...</option>
                </select>
              )}
              {addingNew && (
                <div className="mvp-add-person-form">
                  <div className="mvp-subfield">
                    <label className="mvp-label">Name</label>
                    <input className="mvp-input" value={newName} onChange={(event) => { setNewName(event.target.value); setNameError('') }} />
                    {nameError && <p className="mvp-error">{nameError}</p>}
                  </div>
                  <RelationshipField
                    value={newRelationship}
                    onChange={(val) => { setNewRelationship(val); setRelationshipError('') }}
                    error={relationshipError}
                  />
                  <div className="mvp-add-person-actions">
                    {relatives.length > 0 && (
                      <button
                        type="button"
                        className="mvp-btn mvp-btn-ghost mvp-add-person-cancel"
                        onClick={handleCancelAdd}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      className="mvp-btn mvp-btn-primary mvp-add-person-confirm"
                      onClick={() => void handleAddPerson()}
                    >
                      Add person
                    </button>
                  </div>
                </div>
              )}
              {nameError && !addingNew && <p className="mvp-error">{nameError}</p>}
            </div>
          )}

          <div className="mvp-field mvp-write-story-field">
            <div className={`mvp-write-composer${textError ? ' mvp-write-composer-error' : ''}`}>
              <textarea
                className="mvp-textarea mvp-write-story-input"
                value={text}
                onChange={(event) => { setText(event.target.value); setTextError('') }}
                placeholder={storyPlaceholder}
                autoFocus={!isEditing}
              />
              <div className="mvp-write-composer-bar">
                <span className="mvp-write-composer-hint">Prefer to speak?</span>
                <DictateControl
                  onTranscript={(spoken) => {
                    setText((current) => {
                      const glue = current.trim() ? (current.endsWith('\n') ? '' : ' ') : ''
                      return `${current}${glue}${spoken}`
                    })
                    setTextError('')
                  }}
                />
              </div>
            </div>
            {textError && <p className="mvp-error">{textError}</p>}
          </div>

          <label className="mvp-field mvp-write-title-field">
            <span className="mvp-label">Title <span className="mvp-optional">(optional)</span></span>
            <input
              className="mvp-input"
              value={titleValue}
              onChange={(event) => setTitleValue(event.target.value)}
              placeholder="e.g. Sunday Bread"
            />
          </label>
          {isEditing && (
            <div className="mvp-write-person-selector">
              <span className="mvp-label">Who is this about?</span>
              <select
                className="mvp-select"
                value={selectedId}
                onChange={(event) => {
                  if (event.target.value === 'new') {
                    setAddingNew(true)
                    setNameError('')
                  } else {
                    setSelectedId(event.target.value)
                    setNameError('')
                  }
                }}
              >
                {relatives.map((person) => (
                  <option key={person.id} value={person.id}>
                    {personLabel(person)}
                  </option>
                ))}
                <option value="new">+ Add someone...</option>
              </select>
              {addingNew && (
                <div className="mvp-add-person-form">
                  <div className="mvp-subfield">
                    <label className="mvp-label">Name</label>
                    <input className="mvp-input" value={newName} onChange={(event) => { setNewName(event.target.value); setNameError('') }} />
                    {nameError && <p className="mvp-error">{nameError}</p>}
                  </div>
                  <RelationshipField
                    value={newRelationship}
                    onChange={(val) => { setNewRelationship(val); setRelationshipError('') }}
                    error={relationshipError}
                  />
                  <div className="mvp-add-person-actions">
                    {relatives.length > 0 && (
                      <button
                        type="button"
                        className="mvp-btn mvp-btn-ghost mvp-add-person-cancel"
                        onClick={handleCancelAdd}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      className="mvp-btn mvp-btn-primary mvp-add-person-confirm"
                      onClick={() => void handleAddPerson()}
                    >
                      Add person
                    </button>
                  </div>
                </div>
              )}
              {nameError && !addingNew && <p className="mvp-error">{nameError}</p>}
            </div>
          )}
        </div>
      </main>
      <footer className="mvp-write-footer">
        {saveError && <p className="mvp-error">{saveError}</p>}
        <button className="mvp-btn mvp-btn-primary mvp-btn-block mvp-btn-lg" type="button" onClick={() => void save()} disabled={isSaving}>
          {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Save story'}
        </button>
      </footer>
      <LeaveConfirm open={confirmingLeave} onStay={keepEditing} onDiscard={discardDraft} />
    </div>
  )
}

function SettingsScreen({
  displayName,
  email,
  onSignOut,
}: {
  displayName: string
  email: string
  onSignOut: () => void | Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    setBusy(true)
    setError('')
    try {
      await onSignOut()
    } catch (caught) {
      setError(messageFromError(caught))
      setBusy(false)
    }
  }

  return (
    <main className="mvp-body mvp-settings mvp-tab-screen">
      <div className="mvp-page-head mvp-page-head-start">
        <div className="mvp-page-head-copy">
          <h1 className="mvp-h1">Settings</h1>
        </div>
      </div>

      <div className="mvp-grouped-section">
        <h2 className="mvp-grouped-header">Profile & Account</h2>
        <div className="mvp-grouped-card">
          <div className="mvp-grouped-row">
            <span className="mvp-grouped-row-label">Name</span>
            <span className="mvp-grouped-row-value">{displayName}</span>
          </div>
          <div className="mvp-grouped-row">
            <span className="mvp-grouped-row-label">Email</span>
            <span className="mvp-grouped-row-value">{email}</span>
          </div>
        </div>
      </div>

      <div className="mvp-grouped-section">
        <div className="mvp-grouped-card">
          <button
            type="button"
            className="mvp-grouped-row mvp-grouped-row-action"
            onClick={() => void signOut()}
            disabled={busy}
          >
            <span className="mvp-grouped-row-label" style={{ color: 'var(--danger)', fontWeight: 500 }}>
              <LogOut aria-hidden="true" style={{ width: 18, height: 18 }} />
              {busy ? 'Signing out…' : 'Sign out'}
            </span>
          </button>
        </div>
        {error && <p className="mvp-error" style={{ margin: 'var(--space-2) var(--space-4)' }}>{error}</p>}
      </div>

      <div className="mvp-settings-foot">
        <div className="mvp-settings-illust" aria-hidden="true">
          <img src={settingsIllustrationUrl} alt="" decoding="async" />
        </div>
        <p className="mvp-credits">
          <a href="https://storyset.com" target="_blank" rel="noreferrer">
            Illustrations by Storyset
          </a>
        </p>
      </div>
    </main>
  )
}

function formatRelationshipLabel(value: string) {
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function RelationshipField({
  value,
  onChange,
  error,
  required = false,
  showChips = true,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  showChips?: boolean
}) {
  const chipSet = useMemo(() => new Set<string>(RELATIONSHIP_CHIPS), [])
  const normalized = value.trim().toLowerCase()
  const matchesChip = chipSet.has(normalized)
  const [otherOpen, setOtherOpen] = useState(() => value.trim() !== '' && !matchesChip)
  const [focused, setFocused] = useState(false)
  const otherInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!value.trim()) return
    if (!chipSet.has(value.trim().toLowerCase())) {
      setOtherOpen(true)
    } else {
      setOtherOpen(false)
    }
  }, [value, chipSet])

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return []
    return RELATIONSHIP_SUGGESTIONS.filter(
      (item) => item.includes(query) && item !== query
    ).slice(0, 5)
  }, [value])

  const showInput = !showChips || otherOpen || (value.trim() !== '' && !matchesChip)
  const otherSelected = otherOpen || (value.trim() !== '' && !matchesChip)

  function selectChip(chip: string) {
    onChange(chip)
    setOtherOpen(false)
  }

  function selectOther() {
    setOtherOpen(true)
    if (matchesChip) onChange('')
    otherInputRef.current?.focus()
  }

  return (
    <div className="mvp-field mvp-field-suggest">
      <span className="mvp-label">
        Relationship to you
        {required && <span className="mvp-required"> (required)</span>}
      </span>
      {showChips && (
        <div className="mvp-relationship-chips" role="group" aria-label="Relationship options">
          {RELATIONSHIP_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`mvp-relationship-chip${matchesChip && normalized === chip ? ' selected' : ''}`}
              aria-pressed={matchesChip && normalized === chip}
              onClick={() => selectChip(chip)}
            >
              {formatRelationshipLabel(chip)}
            </button>
          ))}
          <button
            type="button"
            className={`mvp-relationship-chip${otherSelected ? ' selected' : ''}`}
            aria-pressed={otherSelected}
            onClick={selectOther}
          >
            Other
          </button>
        </div>
      )}
      {showInput && (
        <label className="mvp-relationship-other">
          <span className="mvp-sr-only">Custom relationship</span>
          <input
            ref={otherInputRef}
            className="mvp-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="e.g. mentor, cousin, neighbor"
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>
      )}
      {error && <p className="mvp-error">{error}</p>}
      {focused && matches.length > 0 && (
        <div className="mvp-relationship-autocomplete">
          {matches.map((item) => (
            <button
              key={item}
              type="button"
              className="mvp-autocomplete-option"
              onClick={() => {
                onChange(item)
                setFocused(false)
              }}
            >
              {formatRelationshipLabel(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NotFoundScreen({ onHome }: { onHome: () => void }) {
  return (
    <>
      <header className="mvp-top mvp-not-found-top">
        <BrandLogo />
      </header>
      <main className="mvp-body mvp-not-found-body">
        <div className="mvp-not-found-illust" aria-hidden="true">
          <img src={notFoundIllustrationUrl} alt="" decoding="async" />
        </div>
        <h1 className="mvp-h1">This page isn&apos;t here</h1>
        <p className="mvp-lede mvp-not-found-lede">
          The person or story you were looking for may have moved.
        </p>
        <button
          type="button"
          className="mvp-btn mvp-btn-primary mvp-btn-lg mvp-not-found-cta"
          onClick={onHome}
        >
          Go home
        </button>
      </main>
    </>
  )
}

function EmptyState({
  variant = 'default',
  icon: Icon,
  illustration,
  title,
  body,
  action,
}: {
  variant?: 'default' | 'soft'
  icon?: LucideIcon
  illustration?: string
  title?: string
  body: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className={`mvp-empty-state${variant === 'soft' ? ' mvp-empty-state-soft' : ''}`}>
      {illustration && (
        <div className="mvp-empty-state-illust" aria-hidden="true">
          <img src={illustration} alt="" decoding="async" />
        </div>
      )}
      {Icon && !illustration && (
        <div className="mvp-empty-state-icon" aria-hidden="true">
          <Icon />
        </div>
      )}
      {title && <h2 className="mvp-empty-state-title">{title}</h2>}
      <p className="mvp-empty-state-body">{body}</p>
      {action && (
        <button type="button" className="mvp-btn mvp-btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

function BackControl({
  onClick,
  label = 'Back',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button className="mvp-back-btn" type="button" onClick={() => { triggerHaptic('light'); onClick(); }}>
      <ChevronLeft aria-hidden="true" strokeWidth={2.0} />
      <span className="mvp-back-label">{label}</span>
    </button>
  )
}

function BrandLogo() {
  return (
    <div className="mvp-brand-lockup">
      <p className="mvp-brand">Heritage</p>
    </div>
  )
}
