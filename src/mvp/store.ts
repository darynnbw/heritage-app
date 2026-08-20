import type { HeritageDB, Relative, Story, User } from './types'

const STORAGE_KEY = 'heritage.mvp.v1'
const SESSION_KEY = 'heritage.mvp.session'

const ELEANOR_ID = 'rel-eleanor'
const USER = 'daryna'

const seed: HeritageDB = {
  users: [{ username: USER, password: '1234' }],
  relatives: [
    {
      id: ELEANOR_ID,
      userId: USER,
      name: 'Eleanor',
      relationship: 'grandmother',
    },
  ],
  stories: [
    {
      id: 'story-school',
      userId: USER,
      relativeId: ELEANOR_ID,
      title: '10th Grade History with Mr. Davies',
      prompt: 'What was their favorite subject at school?',
      text: 'She mentioned she loved history and literature because of her 10th grade teacher, Mr. Davies.',
      createdAt: '2026-05-14T16:00:00.000Z',
    },
  ],
}

function load(): HeritageDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(seed)
    const parsed = JSON.parse(raw) as HeritageDB
    if (!parsed.users?.length) return structuredClone(seed)
    parsed.stories = (parsed.stories || []).filter((s) => s.id !== 'story-attic')
    return parsed
  } catch {
    return structuredClone(seed)
  }
}

function save(db: HeritageDB) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export const store = {
  getSession(): string | null {
    return localStorage.getItem(SESSION_KEY)
  },

  setSession(username: string | null) {
    if (username) localStorage.setItem(SESSION_KEY, username)
    else localStorage.removeItem(SESSION_KEY)
  },

  login(username: string, password: string): User | null {
    const user = load().users.find(
      (item) =>
        item.username.toLowerCase() === username.trim().toLowerCase() &&
        item.password === password,
    )
    if (!user) return null
    this.setSession(user.username)
    return user
  },

  signup(username: string, password: string): { ok: true } | { ok: false; error: string } {
    const db = load()
    const name = username.trim()
    if (!name) return { ok: false, error: 'Add a name to sign up.' }
    if (!password) return { ok: false, error: 'Add a password to sign up.' }
    if (db.users.some((item) => item.username.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'That name is already in use.' }
    }
    db.users.push({ username: name, password })
    save(db)
    this.setSession(name)
    return { ok: true }
  },

  relatives(userId: string): Relative[] {
    return load()
      .relatives.filter((item) => item.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  stories(userId: string): Story[] {
    return load()
      .stories.filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  storiesFor(userId: string, relativeId: string): Story[] {
    return this.stories(userId).filter((item) => item.relativeId === relativeId)
  },

  relative(userId: string, relativeId: string): Relative | undefined {
    return this.relatives(userId).find((item) => item.id === relativeId)
  },

  story(userId: string, storyId: string): Story | undefined {
    return this.stories(userId).find((item) => item.id === storyId)
  },

  saveRelative(input: Omit<Relative, 'id'> & { id?: string }): Relative {
    const db = load()
    if (input.id) {
      db.relatives = db.relatives.map((item) =>
        item.id === input.id ? { ...item, name: input.name, relationship: input.relationship } : item,
      )
      save(db)
      return db.relatives.find((item) => item.id === input.id)!
    }
    const created: Relative = { ...input, id: id('rel') }
    db.relatives.push(created)
    save(db)
    return created
  },

  saveStory(input: Omit<Story, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Story {
    const db = load()
    if (input.id) {
      db.stories = db.stories.map((item) =>
        item.id === input.id
          ? {
              ...item,
              relativeId: input.relativeId,
              title: input.title,
              prompt: input.prompt,
              text: input.text,
            }
          : item,
      )
      save(db)
      return db.stories.find((item) => item.id === input.id)!
    }
    const created: Story = {
      ...input,
      id: id('story'),
      createdAt: input.createdAt ?? new Date().toISOString(),
    }
    db.stories.push(created)
    save(db)
    return created
  },

  deleteStory(storyId: string) {
    const db = load()
    db.stories = db.stories.filter((item) => item.id !== storyId)
    save(db)
  },
}
