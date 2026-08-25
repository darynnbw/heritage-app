import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ChevronLeft,
  Home,
  Lock,
  Mail,
  Settings,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import welcomeHeroUrl from '../assets/illustration-welcome.svg'
import readingIllustrationUrl from '../assets/illustration-reading.svg'
import journalIllustrationUrl from '../assets/illustration-journal.svg'
import peopleIllustrationUrl from '../assets/illustration-people.svg'
import notFoundIllustrationUrl from '../assets/illustration-not-found.svg'
import settingsIllustrationUrl from '../assets/cherry-blossom-cuate-1.svg'
import { HOME_PROMPTS, RELATIONSHIP_SUGGESTIONS } from './prompts'
import { messageFromError, store } from './store'
import { locationFromPath, pushPath, replacePath } from './routes'
import type { Relative, Screen, SessionUser, Story, Tab } from './types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function snippet(text: string) {
  return text.trim()
}

function personLabel(person: Relative) {
  if (!person.relationship) return person.name
  const relation = person.relationship.charAt(0).toUpperCase() + person.relationship.slice(1)
  return `${relation} ${person.name}`
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
  const appliedBootRoute = useRef(false)

  const userId = session?.id ?? null
  const story = stories.find((item) => item.id === storyId) ?? null
  const relative =
    relatives.find((item) => item.id === relativeId) ??
    relatives.find((item) => item.id === story?.relativeId) ??
    null
  const prompt = HOME_PROMPTS[promptIndex % HOME_PROMPTS.length]
  const showMobileTabs = screen === 'home' || screen === 'people' || screen === 'relative' || screen === 'settings'
  const showDesktopNav = Boolean(userId) && !['welcome', 'login', 'signup', 'onboarding-intro', 'onboarding-relative', 'onboarding-story', 'not-found'].includes(screen)

  function applyLibrary(library: { user: SessionUser; relatives: Relative[]; stories: Story[] }) {
    setSession(library.user)
    setRelatives(library.relatives)
    setStories(library.stories)
  }

  function applyLocation(next: ReturnType<typeof locationFromPath>, nextStories: Story[] = stories) {
    const matchedStory = next.storyId ? nextStories.find((item) => item.id === next.storyId) : undefined
    setScreen(next.screen)
    setTab(next.tab)
    setRelativeId(next.relativeId ?? matchedStory?.relativeId ?? null)
    setStoryId(next.storyId)
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
    const loc = locationFromPath(window.location.pathname, session?.id ?? null)
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
    applyLocation(loc, stories)
  }, [ready, session, relatives, stories])

  useEffect(() => {
    function onPop() {
      applyLocation(locationFromPath(window.location.pathname, session?.id ?? null))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [session, stories])

  function goTab(next: Tab) {
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
    setScreen('write')
  }

  async function afterAuth(isNew: boolean) {
    const library = await refreshLibrary()
    if (isNew || library.relatives.length === 0) {
      setScreen('onboarding-intro')
      replacePath('/')
      return
    }
    setTab('home')
    setScreen('home')
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
            onSwitch={() => {
              setScreen('signup')
              pushPath('/signup')
            }}
            onBack={() => {
              setScreen('welcome')
              pushPath('/')
            }}
          />
        )}
        {screen === 'signup' && (
          <AuthScreen
            mode="signup"
            onDone={afterAuth}
            onSwitch={() => {
              setScreen('login')
              pushPath('/login')
            }}
            onBack={() => {
              setScreen('welcome')
              pushPath('/')
            }}
          />
        )}
        {screen === 'onboarding-intro' && (
          <OnboardingIntro
            onContinue={() => setScreen('onboarding-relative')}
            onSkip={goHome}
          />
        )}
        {screen === 'onboarding-relative' && userId && (
          <OnboardingRelative
            existing={relative}
            onBack={() => setScreen('onboarding-intro')}
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
            onAdd={() => startWrite('')}
          />
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
            backLabel={storyReturn === 'relative' ? personLabel(relative) : 'Home'}
            onBack={() => {
              if (storyReturn === 'relative') {
                setTab('people')
                setScreen('relative')
              } else {
                setTab('home')
                setScreen('home')
              }
            }}
            onEdit={() => {
              setEditingStoryId(story.id)
              setWritePrompt(story.prompt)
              setRelativeId(story.relativeId)
              setScreen('write')
            }}
            onDelete={async () => {
              await store.deleteStory(story.id)
              await refreshLibrary()
              if (storyReturn === 'relative') {
                setTab('people')
                setScreen('relative')
              } else {
                setTab('home')
                setScreen('home')
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
              if (editingStoryId) setScreen('story')
              else if (relativeId && relatives.some((item) => item.id === relativeId)) {
                setTab('people')
                setScreen('relative')
              } else {
                setTab('home')
                setScreen('home')
              }
            }}
            onSaved={async (saved) => {
              await refreshLibrary()
              setStoryId(saved.id)
              setRelativeId(saved.relativeId)
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
  return (
    <nav className="mvp-tabs" aria-label="Main">
      <button
        type="button"
        className={`mvp-tab${tab === 'home' ? ' active' : ''}`}
        onClick={() => onTab('home')}
        aria-current={tab === 'home' ? 'page' : undefined}
      >
        <Home aria-hidden="true" strokeWidth={tab === 'home' ? 2.4 : 1.8} />
        Home
      </button>
      <button
        type="button"
        className={`mvp-tab${tab === 'people' ? ' active' : ''}`}
        onClick={() => onTab('people')}
        aria-current={tab === 'people' ? 'page' : undefined}
      >
        <Users aria-hidden="true" strokeWidth={tab === 'people' ? 2.4 : 1.8} />
        People
      </button>
      <button
        type="button"
        className={`mvp-tab${tab === 'settings' ? ' active' : ''}`}
        onClick={() => onTab('settings')}
        aria-current={tab === 'settings' ? 'page' : undefined}
      >
        <Settings aria-hidden="true" strokeWidth={tab === 'settings' ? 2.4 : 1.8} />
        Settings
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
            Get started
          </button>
          <button className="mvp-btn mvp-btn-ghost mvp-btn-block" onClick={onLogin} id="welcome-login-btn">
            Log in
          </button>
        </div>
      </div>
    </div>
  )
}

function SocialDivider() {
  return (
    <div className="auth-divider">
      <span className="auth-divider-line" />
      <span className="auth-divider-text">or continue with</span>
      <span className="auth-divider-line" />
    </div>
  )
}

function SocialButtons({
  disabled,
  onError,
}: {
  disabled: boolean
  onError: (message: string) => void
}) {
  async function start(provider: 'google' | 'apple') {
    const result = await store.signInWithProvider(provider)
    if (!result.ok) onError(result.error)
  }

  return (
    <div className="auth-social-row">
      <button
        type="button"
        className="auth-social-btn"
        disabled={disabled}
        onClick={() => void start('google')}
        aria-label="Continue with Google"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M47.532 24.552c0-1.636-.134-3.201-.395-4.697H24v8.882h13.204c-.57 3.067-2.3 5.664-4.899 7.41v6.162h7.929c4.636-4.27 7.298-10.556 7.298-17.757z" fill="#4285F4"/>
          <path d="M24 48c6.48 0 11.916-2.148 15.888-5.823l-7.93-6.162c-2.202 1.476-5.022 2.35-7.958 2.35-6.12 0-11.3-4.134-13.152-9.69H2.68v6.362C6.636 42.713 14.765 48 24 48z" fill="#34A853"/>
          <path d="M10.848 28.675A14.974 14.974 0 0 1 9.6 24c0-1.636.285-3.226.795-4.675v-6.362H2.68A23.94 23.94 0 0 0 0 24c0 3.876.93 7.541 2.68 10.675l8.168-6z" fill="#FBBC05"/>
          <path d="M24 9.545c3.45 0 6.545 1.185 8.985 3.518l6.734-6.734C35.896 2.36 30.46 0 24 0 14.765 0 6.636 5.287 2.68 13.325l8.168 6.36C12.7 13.68 17.88 9.545 24 9.545z" fill="#EA4335"/>
        </svg>
        Google
      </button>
      <button
        type="button"
        className="auth-social-btn"
        disabled={disabled}
        onClick={() => void start('apple')}
        aria-label="Continue with Apple"
      >
        <svg width="20" height="20" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57-155.3-127c-52.7-74.5-96.1-188.8-96.1-297.6 0-186.3 121.4-284.7 240.6-284.7 60.8 0 111.7 42.5 147.3 42.5 34 0 89.3-44.5 156.7-44.5 25.3.0 108.2 2.6 168.1 86.6zm-172.9-215.4c31.6-37.5 54.3-89.5 54.3-141.5 0-7.1-.6-14.3-1.9-20.1-51.3 1.9-113 34.3-149.3 77.1-28.3 32.5-55.6 84.5-55.6 137.2 0 7.7 1.3 15.5 1.9 18 3.2.6 8.4 1.3 13.6 1.3 46.2.0 103.7-30.9 136.9-72z"/>
        </svg>
        Apple
      </button>
    </div>
  )
}

function AuthScreen({
  mode,
  onDone,
  onSwitch,
  onBack,
}: {
  mode: 'login' | 'signup'
  onDone: (isNew: boolean) => void | Promise<void>
  onSwitch: () => void
  onBack: () => void
}) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        const result = await store.signup(displayName, email, password)
        if (!result.ok) {
          setError(result.error)
          return
        }
        if (result.needsConfirmation) {
          setNotice('Check your email to finish creating your account.')
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

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <BackControl onClick={onBack} label="Welcome" />
        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <div className="auth-title-accent" />
        <form onSubmit={(event) => void submit(event)} className="auth-form">
          {mode === 'signup' && (
            <div className="mvp-field">
              <label className="mvp-label" htmlFor="auth-name-signup">
                Your name
              </label>
              <div className="mvp-input-wrapper">
                <User className="mvp-input-icon" aria-hidden="true" />
                <input
                  id="auth-name-signup"
                  className="mvp-input with-icon"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  placeholder="Enter your name"
                />
              </div>
            </div>
          )}
          <div className="mvp-field">
            <label className="mvp-label" htmlFor={`auth-email-${mode}`}>
              Email
            </label>
            <div className="mvp-input-wrapper">
              <Mail className="mvp-input-icon" aria-hidden="true" />
              <input
                id={`auth-email-${mode}`}
                className="mvp-input with-icon"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Enter your email"
              />
            </div>
          </div>
          <div className="mvp-field">
            <label className="mvp-label" htmlFor={`auth-password-${mode}`}>Password</label>
            <div className="mvp-input-wrapper">
              <Lock className="mvp-input-icon" aria-hidden="true" />
              <input
                id={`auth-password-${mode}`}
                className="mvp-input with-icon"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Enter your password"
              />
            </div>
          </div>
          {error && <p className="mvp-error">{error}</p>}
          {notice && <p className="mvp-notice">{notice}</p>}
          <button
            className="mvp-btn mvp-btn-primary mvp-btn-block auth-submit"
            type="submit"
            id={`auth-submit-${mode}`}
            disabled={busy}
          >
            {busy ? (mode === 'login' ? 'Logging in…' : 'Creating account…') : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <SocialDivider />
        <SocialButtons disabled={busy} onError={setError} />
        <button className="mvp-switch auth-switch" type="button" onClick={onSwitch}>
          {mode === 'login'
            ? <>No account yet? <span className="auth-switch-link">Sign up</span></>
            : <>Already have an account? <span className="auth-switch-link">Log in</span></>}
        </button>
      </div>
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
    <>
      <header className="mvp-top mvp-top-brand mvp-top-onboard">
        <BrandLogo />
      </header>
      <main className="mvp-body mvp-onboard-intro">
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
        <button className="mvp-btn mvp-btn-primary mvp-btn-block" type="button" onClick={onContinue}>
          Continue
        </button>
        <div className="mvp-skip">
          <button className="mvp-switch" type="button" onClick={onSkip}>
            Go to Home instead
          </button>
        </div>
      </main>
    </>
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
    <>
      <header className="mvp-top mvp-top-onboard">
        <BackControl onClick={onBack} />
      </header>
      <main className="mvp-body mvp-stage">
        <h1 className="mvp-h1">Whose story would you like to preserve today?</h1>
        <label className="mvp-field">
          <span className="mvp-label">Their name</span>
          <input className="mvp-input" value={name} onChange={(event) => { setName(event.target.value); setNameError('') }} placeholder="Eleanor" />
          {nameError && <p className="mvp-error">{nameError}</p>}
        </label>
        <RelationshipField
          value={relationship}
          onChange={(val) => { setRelationship(val); setRelationshipError('') }}
          error={relationshipError}
        />
        <button className="mvp-btn mvp-btn-primary mvp-btn-block" onClick={() => void continueOnboarding()} disabled={busy}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
        {saveError && <p className="mvp-error">{saveError}</p>}
        <div className="mvp-skip">
          <button className="mvp-switch" type="button" onClick={onSkip}>
            Go to Home instead
          </button>
        </div>
      </main>
    </>
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
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!text.trim()) {
      setError('Write something you want to remember before saving.')
      return
    }
    setBusy(true)
    try {
      await store.saveStory({
        relativeId: relative.id,
        title: title.trim(),
        prompt: prompt.trim(),
        text: text.trim(),
      })
      await onSaved()
    } catch (caught) {
      setError(messageFromError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="mvp-top mvp-top-onboard">
        <BackControl onClick={onBack} />
      </header>
      <main className="mvp-body mvp-stage">
        <h1 className="mvp-h1">What do you want to remember about {relative.name}?</h1>
        <label className="mvp-field">
          <span className="mvp-label">Prompt / Question <span className="mvp-optional">(optional)</span></span>
          <input className="mvp-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="e.g. What family tradition do you remember?" />
        </label>
        <label className="mvp-field">
          <span className="mvp-label">Title <span className="mvp-optional">(optional)</span></span>
          <input className="mvp-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Sunday Bread" />
        </label>
        <label className="mvp-field">
          <span className="mvp-label">Their story</span>
          <textarea className="mvp-textarea story" value={text} onChange={(event) => { setText(event.target.value); setError('') }} />
          {error && <p className="mvp-error">{error}</p>}
        </label>
        <button className="mvp-btn mvp-btn-primary mvp-btn-block" onClick={() => void save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save story'}
        </button>
        <div className="mvp-skip">
          <button className="mvp-switch" type="button" onClick={onSkip}>
            Skip this story
          </button>
        </div>
      </main>
    </>
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
      <header className="mvp-top mvp-top-brand">
        <BrandLogo />
      </header>
      <main className="mvp-body mvp-home">
        <section className="mvp-prompt-card">
          <p className="mvp-quote">“{prompt}”</p>
          <div className="mvp-prompt-actions">
            <button className="mvp-btn mvp-btn-ghost" type="button" onClick={onSwap}>Swap</button>
            <button className="mvp-btn mvp-btn-primary" type="button" onClick={onWrite}>Answer question</button>
            <button className="mvp-btn mvp-btn-secondary mvp-btn-block" type="button" onClick={onFreeWrite}>Skip the question</button>
          </div>
        </section>
        <section className="mvp-feed">
          {stories.length > 0 && <h2 className="mvp-section-label">Recent entries</h2>}
          {stories.length === 0 && (
            <EmptyState
              illustration={journalIllustrationUrl}
              title="No stories yet"
              body="Stories you save will show up here."
            />
          )}
          {stories.map((item) => {
            const person = relatives.find((relative) => relative.id === item.relativeId)
            const hasPrompt = Boolean(item.prompt?.trim())
            const hasTitle = Boolean(item.title?.trim())
            const kickerText = hasPrompt
              ? `“${item.prompt.trim()}”`
              : hasTitle
              ? `“${item.title.trim()}”`
              : null

            return (
              <button key={item.id} className="mvp-entry" onClick={() => onOpenStory(item.id)}>
                <div className="mvp-entry-top">
                  <span className="mvp-entry-name">{person?.name ?? 'Someone'}</span>
                  <span className="mvp-entry-date">{formatDate(item.createdAt)}</span>
                </div>
                {kickerText && <p className="mvp-entry-kicker">{kickerText}</p>}
                <p className="mvp-entry-snippet">{snippet(item.text)}</p>
              </button>
            )
          })}
        </section>
      </main>
    </>
  )
}

function PeopleScreen({
  relatives,
  stories,
  onOpen,
  onAdd,
}: {
  relatives: Relative[]
  stories: Story[]
  onOpen: (id: string) => void
  onAdd: () => void
}) {
  return (
    <>
      <header className="mvp-top mvp-top-brand">
        <BrandLogo />
      </header>
      <main className="mvp-body mvp-page">
        <div className="mvp-page-head mvp-page-head-start">
          <div className="mvp-page-head-copy">
            <h1 className="mvp-h1">People</h1>
            <p className="mvp-lede">The relatives whose stories you are keeping.</p>
          </div>
          <button className="mvp-btn mvp-btn-secondary" type="button" onClick={onAdd}>Add</button>
        </div>
        {relatives.length === 0 && (
          <EmptyState
            illustration={peopleIllustrationUrl}
            title="Who comes to mind?"
            body="Start with one person whose stories you want to keep."
            action={{ label: 'Add someone', onClick: onAdd }}
          />
        )}
        <div className="mvp-card-grid">
          {relatives.map((person) => {
            const count = stories.filter((item) => item.relativeId === person.id).length
            return (
              <button key={person.id} className="mvp-person" onClick={() => onOpen(person.id)}>
                <div className="mvp-person-top">
                  <span className="mvp-person-name">{person.name}</span>
                  <span className="mvp-person-meta">{count === 1 ? '1 story' : `${count} stories`}</span>
                </div>
                {person.relationship && <p className="mvp-person-meta mvp-person-rel">{person.relationship}</p>}
              </button>
            )
          })}
        </div>

      </main>
    </>
  )
}

function RelativeScreen({
  relative,
  stories,
  onBack,
  onOpenStory,
  onWrite,
  onDelete,
}: {
  relative: Relative
  stories: Story[]
  onBack: () => void
  onOpenStory: (id: string) => void
  onWrite: () => void
  onDelete: () => void | Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  return (
    <>
      <header className="mvp-top">
        <BackControl onClick={onBack} label="People" />
      </header>
      <main className="mvp-body mvp-page">
        <div className="mvp-page-head">
          <h1 className="mvp-h1">{personLabel(relative)}</h1>
          <button className="mvp-btn mvp-btn-secondary mvp-page-action-header" type="button" onClick={onWrite}>
            Write a story
          </button>
        </div>
        {stories.length === 0 && (
          <EmptyState
            illustration={journalIllustrationUrl}
            title={`No stories about ${relative.name} yet`}
            body="Write the first story you want your family to keep."
            action={{ label: 'Write a story', onClick: onWrite }}
          />
        )}
        <div className="mvp-card-grid mvp-relative-stories-grid">
          {stories.map((item) => {
            const hasTitle = Boolean(item.title?.trim())
            const hasPrompt = Boolean(item.prompt?.trim())
            const displayTitle = hasTitle ? item.title.trim() : hasPrompt ? `“${item.prompt.trim()}”` : formatLongDate(item.createdAt)

            return (
              <button key={item.id} className="mvp-entry mvp-relative-story-card" onClick={() => onOpenStory(item.id)}>
                <div className="mvp-entry-top">
                  <span className="mvp-entry-heading">{displayTitle}</span>
                  <span className="mvp-entry-date">{formatDate(item.createdAt)}</span>
                </div>
                <p className="mvp-entry-snippet">{snippet(item.text)}</p>
              </button>
            )
          })}
        </div>
        <div className="mvp-relative-remove">
          <button className="mvp-switch" type="button" onClick={() => setConfirming(true)}>
            Remove this person
          </button>
        </div>

        {confirming && (
          <div className="mvp-modal-backdrop" onClick={() => setConfirming(false)}>
            <div className="mvp-modal-card" onClick={(event) => event.stopPropagation()}>
              <h2 className="mvp-modal-title">Remove {relative.name}?</h2>
              <p className="mvp-modal-msg">
                This also removes every story about them. That can&apos;t be undone.
              </p>
              <div className="mvp-modal-actions">
                <button className="mvp-btn mvp-btn-ghost" type="button" onClick={() => setConfirming(false)}>
                  Keep them
                </button>
                <button
                  className="mvp-btn mvp-btn-secondary"
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
                  {isDeleting ? 'Removing…' : 'Remove them'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function StoryScreen({
  relative,
  story,
  backLabel,
  onBack,
  onEdit,
  onDelete,
}: {
  relative: Relative
  story: Story
  backLabel: string
  onBack: () => void
  onEdit: () => void
  onDelete: () => void | Promise<void>
}) {
  const hasTitle = Boolean(story.title?.trim())
  const hasPrompt = Boolean(story.prompt?.trim())
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  return (
    <>
      <header className="mvp-top">
        <BackControl onClick={onBack} label={backLabel} />
      </header>
      <main className="mvp-body reading mvp-read">
        <div className="mvp-read-illust" aria-hidden="true">
          <img src={readingIllustrationUrl} alt="" decoding="async" />
        </div>
        <div className="mvp-read-head">
          <div className="mvp-read-info">
            <h1 className="mvp-read-title">
              {hasTitle
                ? story.title.trim()
                : hasPrompt
                ? `"${story.prompt.trim()}"`
                : `A story about ${relative.name}`}
            </h1>
            <p className="mvp-read-meta">
              {personLabel(relative)} · Written {formatDate(story.createdAt)}
            </p>
            {hasTitle && hasPrompt && (
              <p className="mvp-read-prompt">"{story.prompt.trim()}"</p>
            )}
          </div>
          <div className="mvp-read-actions mvp-desktop-actions">
            <button className="mvp-btn mvp-btn-secondary mvp-read-edit" type="button" onClick={onEdit}>
              Edit
            </button>
            <button
              className="mvp-btn mvp-btn-secondary"
              type="button"
              onClick={() => setConfirming(true)}
            >
              Delete
            </button>
          </div>
        </div>
        <p className="mvp-read-body">{story.text}</p>
        
        <div className="mvp-read-actions mvp-mobile-actions">
          <button className="mvp-btn mvp-btn-secondary mvp-read-edit" type="button" onClick={onEdit}>
            Edit
          </button>
          <button
            className="mvp-btn mvp-btn-secondary"
            type="button"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        </div>


        {confirming && (
          <div className="mvp-modal-backdrop" onClick={() => setConfirming(false)}>
            <div className="mvp-modal-card" onClick={(e) => e.stopPropagation()}>
              <h2 className="mvp-modal-title">Delete story</h2>
              <p className="mvp-modal-msg">
                Are you sure you want to delete this story? This action cannot be undone.
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
                  {isDeleting ? 'Deleting…' : 'Delete'}
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
  const [selectedId, setSelectedId] = useState(
    editing?.relativeId ?? presetRelativeId ?? relatives[0]?.id ?? '',
  )
  const [addingNew, setAddingNew] = useState(relatives.length === 0 && !editing)
  const [newName, setNewName] = useState('')
  const [newRelationship, setNewRelationship] = useState('')
  const [promptValue, setPromptValue] = useState(editing?.prompt ?? prompt ?? '')
  const [titleValue, setTitleValue] = useState(editing?.title ?? '')
  const [text, setText] = useState(editing?.text ?? '')
  const [nameError, setNameError] = useState('')
  const [relationshipError, setRelationshipError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [textError, setTextError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function save() {
    if (!titleValue.trim()) {
      setTitleError('Add a title before saving.')
      return
    }
    if (!text.trim()) {
      setTextError('Write something you want to remember before saving.')
      return
    }

    let relativeId = selectedId
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
        prompt: promptValue.trim(),
        text: text.trim(),
      })
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
    <>
      <header className="mvp-top">
        <BackControl onClick={onCancel} label={backLabel} />
      </header>
      <main className="mvp-body mvp-write">
        <h1 className="mvp-h1 mvp-write-title">{editing ? 'Edit story' : 'Add story'}</h1>
        <div className="mvp-write-main">
          {!editing && (
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
                  <h3 className="mvp-add-person-title">Add someone</h3>
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
            </div>
          )}
          <label className="mvp-field">
            <span className="mvp-label">Title</span>
            <input
              className={`mvp-input${titleError ? ' mvp-input-error' : ''}`}
              value={titleValue}
              onChange={(event) => { setTitleValue(event.target.value); setTitleError('') }}
              placeholder="e.g. Sunday Bread"
            />
            {titleError && <p className="mvp-error">{titleError}</p>}
          </label>
          <label className="mvp-field">
            <span className="mvp-label">Question <span className="mvp-optional">(optional)</span></span>
            <input
              className="mvp-input"
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              placeholder="e.g. What family tradition do you remember?"
            />
          </label>
          <label className="mvp-field">
            <span className="mvp-label">Their story</span>
            <textarea className={`mvp-textarea story${textError ? ' mvp-input-error' : ''}`} value={text} onChange={(event) => { setText(event.target.value); setTextError('') }} />
            {textError && <p className="mvp-error">{textError}</p>}
          </label>
          <button className="mvp-btn mvp-btn-primary mvp-btn-block mvp-write-save" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Save story'}
          </button>
          {saveError && <p className="mvp-error">{saveError}</p>}
        </div>
      </main>
    </>
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
    <>
      <header className="mvp-top mvp-top-brand">
        <BrandLogo />
      </header>
      <main className="mvp-body mvp-settings">
        <h1 className="mvp-h1">Settings</h1>
        <div className="mvp-settings-card">
          <div className="mvp-settings-row">
            <User aria-hidden="true" />
            <div>
              <p className="mvp-settings-kicker">Account</p>
              <p className="mvp-settings-value">{displayName}</p>
              {email && <p className="mvp-settings-kicker">{email}</p>}
            </div>
          </div>
        </div>
        <p className="mvp-lede">Stories stay with this account. This first version is a simple keep, not a permanent family vault.</p>
        <div className="mvp-settings-illust" aria-hidden="true">
          <img src={settingsIllustrationUrl} alt="" decoding="async" />
        </div>
        {error && <p className="mvp-error">{error}</p>}
        <button className="mvp-btn mvp-btn-secondary mvp-btn-block" type="button" onClick={() => void signOut()} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
        <div className="mvp-credits">
          <h2 className="mvp-credits-title">Credits</h2>
          <p>
            <a href="https://storyset.com/work" target="_blank" rel="noreferrer">
              Illustrations by Storyset
            </a>
          </p>
          <p>
            <a href="https://storyset.com/people" target="_blank" rel="noreferrer">
              People illustrations by Storyset
            </a>
          </p>
          <p>
            <a href="https://storyset.com/nature" target="_blank" rel="noreferrer">
              Nature illustrations by Storyset
            </a>
          </p>
          <p>
            <a href="https://storyset.com/online" target="_blank" rel="noreferrer">
              Online illustrations by Storyset
            </a>
          </p>
        </div>
      </main>
    </>
  )
}

function RelationshipField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const [focused, setFocused] = useState(false)
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return []
    return RELATIONSHIP_SUGGESTIONS.filter(
      (item) => item.includes(query) && item !== query
    ).slice(0, 5)
  }, [value])

  return (
    <div className="mvp-field mvp-field-suggest">
      <label>
        <span className="mvp-label">Relationship to you</span>
        <input
          className="mvp-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          autoComplete="off"
        />
      </label>
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
              {item}
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
      <header className="mvp-top">
        <BackControl onClick={onHome} label="Home" />
      </header>
      <main className="mvp-body">
        <EmptyState
          illustration={notFoundIllustrationUrl}
          title="These memories aren't here yet"
          body="Head home — your people and stories are there."
          action={{ label: 'Go home', onClick: onHome }}
        />
      </main>
    </>
  )
}

function EmptyState({
  icon: Icon,
  illustration,
  title,
  body,
  action,
}: {
  icon?: LucideIcon
  illustration?: string
  title: string
  body: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="mvp-empty-state">
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
      <h2 className="mvp-empty-state-title">{title}</h2>
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
    <button className="mvp-back-btn" type="button" onClick={onClick}>
      <ChevronLeft aria-hidden="true" strokeWidth={2.5} />
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
