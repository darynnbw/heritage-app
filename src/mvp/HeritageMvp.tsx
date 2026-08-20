import { useMemo, useState, type FormEvent } from 'react'
import { Home, Settings, Trash2, User } from 'lucide-react'
import { HOME_PROMPTS, RELATIONSHIP_SUGGESTIONS } from './prompts'
import { store } from './store'
import type { Relative, Screen, Story, Tab } from './types'

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
  const [userId, setUserId] = useState<string | null>(() => store.getSession())
  const [screen, setScreen] = useState<Screen>(() => {
    const session = store.getSession()
    if (!session) return 'login'
    return store.relatives(session).length === 0 ? 'onboarding-intro' : 'home'
  })
  const [tab, setTab] = useState<Tab>('home')
  const [promptIndex, setPromptIndex] = useState(0)
  const [relativeId, setRelativeId] = useState<string | null>(null)
  const [storyId, setStoryId] = useState<string | null>(null)
  const [writePrompt, setWritePrompt] = useState('')
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null)
  const [storyReturn, setStoryReturn] = useState<'home' | 'relative'>('home')
  const [tick, setTick] = useState(0)

  const refresh = () => setTick((value) => value + 1)

  const relatives = useMemo(
    () => (userId ? store.relatives(userId) : []),
    [userId, tick],
  )
  const stories = useMemo(
    () => (userId ? store.stories(userId) : []),
    [userId, tick],
  )

  const relative = relatives.find((item) => item.id === relativeId) ?? null
  const story = stories.find((item) => item.id === storyId) ?? null
  const prompt = HOME_PROMPTS[promptIndex % HOME_PROMPTS.length]
  const showMobileTabs = screen === 'home' || screen === 'people' || screen === 'relative' || screen === 'settings'
  const showDesktopNav = Boolean(userId) && !['login', 'signup', 'onboarding-intro', 'onboarding-relative', 'onboarding-story'].includes(screen)

  function goTab(next: Tab) {
    setTab(next)
    if (next === 'home') setScreen('home')
    if (next === 'people') setScreen('people')
    if (next === 'settings') setScreen('settings')
  }

  function openRelative(id: string) {
    setRelativeId(id)
    setTab('people')
    setScreen('relative')
  }

  function openStory(id: string, from: 'home' | 'relative') {
    const found = stories.find((item) => item.id === id)
    setStoryId(id)
    setRelativeId(found?.relativeId ?? relativeId)
    setStoryReturn(from)
    setScreen('story')
  }

  function startWrite(nextPrompt: string, presetRelativeId: string | null = null) {
    setWritePrompt(nextPrompt)
    setEditingStoryId(null)
    setRelativeId(presetRelativeId)
    setScreen('write')
  }

  function afterAuth(name: string, isNew: boolean) {
    setUserId(name)
    if (isNew || store.relatives(name).length === 0) {
      setScreen('onboarding-intro')
      return
    }
    setTab('home')
    setScreen('home')
  }

  return (
    <div className="mvp">
      <div className={`mvp-shell${showMobileTabs ? ' has-tabs' : ''}`}>
        {showDesktopNav && (
          <DesktopNav tab={tab} onTab={goTab} />
        )}

        {screen === 'login' && <AuthScreen mode="login" onDone={afterAuth} onSwitch={() => setScreen('signup')} />}
        {screen === 'signup' && <AuthScreen mode="signup" onDone={afterAuth} onSwitch={() => setScreen('login')} />}
        {screen === 'onboarding-intro' && (
          <OnboardingIntro onContinue={() => setScreen('onboarding-relative')} />
        )}
        {screen === 'onboarding-relative' && userId && (
          <OnboardingRelative
            userId={userId}
            onContinue={(id) => {
              setRelativeId(id)
              refresh()
              setScreen('onboarding-story')
            }}
          />
        )}
        {screen === 'onboarding-story' && userId && relative && (
          <OnboardingStory
            userId={userId}
            relative={relative}
            onSaved={() => {
              refresh()
              setTab('people')
              setScreen('relative')
            }}
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
        {screen === 'relative' && userId && relative && (
          <RelativeScreen
            relative={relative}
            stories={store.storiesFor(userId, relative.id)}
            onBack={() => {
              setTab('people')
              setScreen('people')
            }}
            onOpenStory={(id) => openStory(id, 'relative')}
            onWrite={() => startWrite('', relative.id)}
          />
        )}
        {screen === 'story' && relative && story && (
          <StoryScreen
            relative={relative}
            story={story}
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
            onDelete={() => {
              store.deleteStory(story.id)
              refresh()
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
        {screen === 'write' && userId && (
          <WriteScreen
            userId={userId}
            relatives={relatives}
            prompt={writePrompt}
            presetRelativeId={relativeId}
            editing={editingStoryId ? store.story(userId, editingStoryId) : undefined}
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
            onSaved={(saved) => {
              refresh()
              setStoryId(saved.id)
              setRelativeId(saved.relativeId)
              setStoryReturn(tab === 'home' ? 'home' : 'relative')
              setScreen('story')
            }}
            onRefreshRelatives={refresh}
          />
        )}
        {screen === 'settings' && userId && (
          <SettingsScreen
            userId={userId}
            onSignOut={() => {
              store.setSession(null)
              setUserId(null)
              setScreen('login')
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
        <p className="mvp-brand">Heritage</p>
        <nav className="mvp-desktop-links">
          <button className={tab === 'home' ? 'active' : ''} onClick={() => onTab('home')}>Home</button>
          <button className={tab === 'people' ? 'active' : ''} onClick={() => onTab('people')}>People</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => onTab('settings')}>Settings</button>
        </nav>
      </div>
    </header>
  )
}

function TabBar({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <nav className="mvp-tabs" aria-label="Main">
      <button className={`mvp-tab${tab === 'home' ? ' active' : ''}`} onClick={() => onTab('home')}>
        <Home strokeWidth={tab === 'home' ? 2.4 : 1.8} />
        Home
      </button>
      <button className={`mvp-tab${tab === 'people' ? ' active' : ''}`} onClick={() => onTab('people')}>
        <User strokeWidth={tab === 'people' ? 2.4 : 1.8} />
        People
      </button>
      <button className={`mvp-tab${tab === 'settings' ? ' active' : ''}`} onClick={() => onTab('settings')}>
        <Settings strokeWidth={tab === 'settings' ? 2.4 : 1.8} />
        Settings
      </button>
    </nav>
  )
}

function AuthScreen({
  mode,
  onDone,
  onSwitch,
}: {
  mode: 'login' | 'signup'
  onDone: (username: string, isNew: boolean) => void
  onSwitch: () => void
}) {
  const [username, setUsername] = useState(mode === 'login' ? 'daryna' : '')
  const [password, setPassword] = useState(mode === 'login' ? '1234' : '')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'signup') {
      const result = store.signup(username, password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onDone(username.trim(), true)
      return
    }
    const user = store.login(username, password)
    if (!user) {
      setError('Check your name and password.')
      return
    }
    onDone(user.username, false)
  }

  return (
    <>
      <header className="mvp-top mvp-top-brand">
        <p className="mvp-brand">Heritage</p>
      </header>
      <main className="mvp-body mvp-auth mvp-stage">
        <h1 className="mvp-h1">{mode === 'login' ? 'Log in' : 'Sign up'}</h1>
        <p className="mvp-lede">
          {mode === 'login'
            ? 'Come back to the stories you have been writing.'
            : 'Create a simple account so your stories can live with you.'}
        </p>
        <form onSubmit={submit} className="mvp-auth-form">
          <label className="mvp-field">
            <span className="mvp-label">Name</span>
            <input className="mvp-input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label className="mvp-field">
            <span className="mvp-label">Password</span>
            <input className="mvp-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {error && <p className="mvp-error">{error}</p>}
          <button className="mvp-btn mvp-btn-primary mvp-btn-block mvp-auth-submit" type="submit">
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <button className="mvp-switch" type="button" onClick={onSwitch}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
      </main>
    </>
  )
}

function OnboardingIntro({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      <header className="mvp-top mvp-top-brand">
        <p className="mvp-brand">Heritage</p>
      </header>
      <main className="mvp-body mvp-stage mvp-stage-center">
        <h1 className="mvp-h1">Heritage</h1>
        <p className="mvp-lede">Preserve one story you want your family to remember.</p>
        <button className="mvp-btn mvp-btn-primary" onClick={onContinue}>Continue</button>
      </main>
    </>
  )
}

function OnboardingRelative({
  userId,
  onContinue,
}: {
  userId: string
  onContinue: (relativeId: string) => void
}) {
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [nameError, setNameError] = useState('')
  const [relationshipError, setRelationshipError] = useState('')

  function continueOnboarding() {
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

    const relative = store.saveRelative({ userId, name: name.trim(), relationship: relationship.trim() })
    onContinue(relative.id)
  }

  return (
    <>
      <header className="mvp-top mvp-top-brand">
        <p className="mvp-brand">Heritage</p>
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
        <button className="mvp-btn mvp-btn-primary mvp-btn-block" onClick={continueOnboarding}>Continue</button>
      </main>
    </>
  )
}

function OnboardingStory({
  userId,
  relative,
  onSaved,
}: {
  userId: string
  relative: Relative
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  function save() {
    if (!text.trim()) {
      setError('Write something you want to remember before saving.')
      return
    }
    store.saveStory({
      userId,
      relativeId: relative.id,
      title: title.trim(),
      prompt: prompt.trim(),
      text: text.trim(),
    })
    onSaved()
  }

  return (
    <>
      <header className="mvp-top mvp-top-brand">
        <p className="mvp-brand">Heritage</p>
      </header>
      <main className="mvp-body mvp-stage">
        <h1 className="mvp-h1">What do you want to remember about {relative.name}?</h1>
        <label className="mvp-field">
          <span className="mvp-label">Prompt / Question <span className="mvp-optional">(optional)</span></span>
          <input className="mvp-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="e.g. What family tradition do you remember?" />
        </label>
        <label className="mvp-field">
          <span className="mvp-label">Story title <span className="mvp-optional">(optional)</span></span>
          <input className="mvp-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Sunday Bread" />
        </label>
        <label className="mvp-field">
          <span className="mvp-label">Their story</span>
          <textarea className="mvp-textarea story" value={text} onChange={(event) => { setText(event.target.value); setError('') }} />
          {error && <p className="mvp-error">{error}</p>}
        </label>
        <button className="mvp-btn mvp-btn-primary mvp-btn-block" onClick={save}>Save story</button>
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
        <p className="mvp-brand">Heritage</p>
      </header>
      <main className="mvp-body mvp-home">
        <section className="mvp-prompt-card">
          <p className="mvp-quote">“{prompt}”</p>
          <div className="mvp-actions">
            <button className="mvp-btn mvp-btn-ghost" onClick={onSwap}>Swap</button>
            <button className="mvp-btn mvp-btn-primary mvp-btn-write" onClick={onWrite}>Write their answer</button>
            <button className="mvp-btn mvp-btn-secondary mvp-btn-block" onClick={onFreeWrite}>Free write</button>
          </div>
        </section>
        <section className="mvp-feed">
          <h2 className="mvp-section-label">Recent entries</h2>
          {stories.length === 0 && <p className="mvp-empty">No stories yet. Write the first one when you are ready.</p>}
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
        <p className="mvp-brand">Heritage</p>
      </header>
      <main className="mvp-body mvp-page">
        <div className="mvp-page-head">
          <div>
            <h1 className="mvp-h1">People</h1>
            <p className="mvp-lede">The relatives whose stories you are keeping.</p>
          </div>
        </div>
        {relatives.length === 0 && <p className="mvp-empty">No one yet.</p>}
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
        <button className="mvp-btn mvp-btn-secondary mvp-btn-block mvp-page-action" onClick={onAdd}>
          Write about someone
        </button>
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
}: {
  relative: Relative
  stories: Story[]
  onBack: () => void
  onOpenStory: (id: string) => void
  onWrite: () => void
}) {
  return (
    <>
      <header className="mvp-top">
        <button className="mvp-back" onClick={onBack}>← Back</button>
      </header>
      <main className="mvp-body mvp-page">
        <div className="mvp-page-head">
          <h1 className="mvp-h1">{personLabel(relative)}</h1>
          <button className="mvp-btn mvp-btn-secondary mvp-page-action-header" onClick={onWrite}>
            Write a story
          </button>
        </div>
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
      </main>
    </>
  )
}

function StoryScreen({
  relative,
  story,
  onBack,
  onEdit,
  onDelete,
}: {
  relative: Relative
  story: Story
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const hasTitle = Boolean(story.title?.trim())
  const hasPrompt = Boolean(story.prompt?.trim())
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <header className="mvp-top">
        <button className="mvp-back" onClick={onBack}>← Back</button>
      </header>
      <main className="mvp-body reading mvp-read">
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
          <div className="mvp-read-actions">
            <button className="mvp-btn mvp-btn-secondary mvp-read-edit" onClick={onEdit}>
              Edit
            </button>
            <button
              className="mvp-btn mvp-btn-secondary mvp-read-delete-icon"
              onClick={() => setConfirming(true)}
              title="Delete story"
              aria-label="Delete story"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <p className="mvp-read-body">{story.text}</p>

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
                  onClick={() => {
                    setConfirming(false)
                    onDelete()
                  }}
                >
                  Delete
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
  userId,
  relatives,
  prompt,
  presetRelativeId,
  editing,
  onCancel,
  onSaved,
  onRefreshRelatives,
}: {
  userId: string
  relatives: Relative[]
  prompt: string
  presetRelativeId: string | null
  editing?: Story
  onCancel: () => void
  onSaved: (story: Story) => void
  onRefreshRelatives?: () => void
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
  const [textError, setTextError] = useState('')

  function save() {
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

      const created = store.saveRelative({
        userId,
        name: newName.trim(),
        relationship: newRelationship.trim(),
      })
      relativeId = created.id
      if (onRefreshRelatives) {
        onRefreshRelatives()
      }
    }
    if (!text.trim()) {
      setTextError('Write something you want to remember before saving.')
      return
    }
    const saved = store.saveStory({
      id: editing?.id,
      userId,
      relativeId,
      title: titleValue.trim(),
      prompt: promptValue.trim(),
      text: text.trim(),
      createdAt: editing?.createdAt,
    })
    onSaved(saved)
  }

  function handleAddPerson() {
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

    const created = store.saveRelative({
      userId,
      name: newName.trim(),
      relationship: newRelationship.trim(),
    })
    if (onRefreshRelatives) {
      onRefreshRelatives()
    }
    setSelectedId(created.id)
    setAddingNew(false)
    setNewName('')
    setNewRelationship('')
    setNameError('')
    setRelationshipError('')
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
        <button className="mvp-back" onClick={onCancel}>← Back</button>
      </header>
      <main className={`mvp-body mvp-write${editing ? ' mvp-write-solo' : ''}`}>
        {!editing && (
          <div className="mvp-write-side">
            <div className="mvp-write-person-selector">
              <span className="mvp-label">Who is this about?</span>
              {!addingNew && relatives.length > 0 && (
                <select
                  className="mvp-select"
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value)
                    setNameError('')
                  }}
                >
                  {relatives.map((person) => (
                    <option key={person.id} value={person.id}>
                      {personLabel(person)}
                    </option>
                  ))}
                </select>
              )}
              {addingNew ? (
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
                        className="mvp-btn mvp-btn-secondary mvp-add-person-cancel"
                        onClick={handleCancelAdd}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      className="mvp-btn mvp-btn-primary mvp-add-person-confirm"
                      onClick={handleAddPerson}
                    >
                      Add person
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mvp-btn mvp-btn-secondary mvp-btn-block mvp-add-someone"
                  onClick={() => {
                    setAddingNew(true)
                    setNameError('')
                  }}
                >
                  Add someone
                </button>
              )}
            </div>
          </div>
        )}
        <div className="mvp-write-main">
          <label className="mvp-field">
            <span className="mvp-label">Prompt / Question <span className="mvp-optional">(optional)</span></span>
            <input
              className="mvp-input"
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              placeholder="e.g. What family tradition do you remember?"
            />
          </label>
          <label className="mvp-field">
            <span className="mvp-label">Story title <span className="mvp-optional">(optional)</span></span>
            <input
              className="mvp-input"
              value={titleValue}
              onChange={(event) => setTitleValue(event.target.value)}
              placeholder="e.g. Sunday Bread"
            />
          </label>
          <label className="mvp-field">
            <span className="mvp-label">Their story</span>
            <textarea className="mvp-textarea story" value={text} onChange={(event) => { setText(event.target.value); setTextError('') }} />
            {textError && <p className="mvp-error">{textError}</p>}
          </label>
          <button className="mvp-btn mvp-btn-primary mvp-btn-block mvp-write-save" onClick={save}>
            {editing ? 'Save changes' : 'Save story'}
          </button>
        </div>
      </main>
    </>
  )
}

function SettingsScreen({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  return (
    <>
      <header className="mvp-top mvp-top-brand">
        <p className="mvp-brand">Heritage</p>
      </header>
      <main className="mvp-body mvp-stage">
        <h1 className="mvp-h1">Settings</h1>
        <p className="mvp-lede">Signed in as {userId}.</p>
        <p className="mvp-lede">Your stories are saved with this account. This is a simple first version, not a permanent family vault.</p>
        <button className="mvp-btn mvp-btn-secondary" onClick={onSignOut}>Sign out</button>
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
    <div className="mvp-field" style={{ position: 'relative' }}>
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
