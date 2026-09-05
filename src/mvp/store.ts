import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Relative, SessionUser, Story } from './types'

export class StoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StoreError'
  }
}

export type AuthResult =
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; error: string }

export type Library = {
  user: SessionUser
  relatives: Relative[]
  stories: Story[]
}

function mapAuthMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login')) return 'Check your email and password.'
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'That email is already in use.'
  }
  if (lower.includes('password should be') || lower.includes('password is known')) {
    return 'Use at least 6 characters for your password.'
  }
  if (lower.includes('email not confirmed')) return 'Confirm your email before logging in.'
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many tries. Wait a moment and try again.'
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'Enter a valid email address.'
  }
  if (lower.includes('unsupported provider') || lower.includes('provider is not enabled')) {
    return 'That sign-in method is not connected yet.'
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Check your connection and try again.'
  }
  return 'Something went wrong. Try again.'
}

export function messageFromError(error: unknown): string {
  if (error instanceof StoreError) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return mapAuthMessage(String((error as { message: string }).message))
  }
  return 'Something went wrong. Try again.'
}

function throwIf(error: { message: string } | null): void {
  if (error) throw new StoreError(mapAuthMessage(error.message))
}

function mapRelative(row: {
  id: string
  user_id: string
  name: string
  relationship: string
}): Relative {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    relationship: row.relationship,
  }
}

function mapStory(row: {
  id: string
  user_id: string
  relative_id: string
  title: string
  prompt: string
  body: string
  created_at: string
}): Story {
  return {
    id: row.id,
    userId: row.user_id,
    relativeId: row.relative_id,
    title: row.title,
    prompt: row.prompt,
    text: row.body,
    createdAt: row.created_at,
  }
}

function displayNameFromUser(user: User, fallback?: string | null): string {
  const meta = user.user_metadata ?? {}
  const fromMeta = [meta.display_name, meta.full_name, meta.name]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find(Boolean)
  if (fromMeta) return fromMeta.slice(0, 80)
  if (fallback?.trim()) return fallback.trim().slice(0, 80)
  const fromEmail = user.email?.split('@')[0]?.trim()
  return (fromEmail || 'Friend').slice(0, 80)
}

async function requireUser(): Promise<User> {
  const { data, error } = await supabase.auth.getUser()
  throwIf(error)
  if (!data.user) throw new StoreError('Sign in to continue.')
  return data.user
}

async function sessionUserFrom(user: User): Promise<SessionUser> {
  const { data, error } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
  throwIf(error)

  let displayName = data?.display_name?.trim() || ''
  if (!displayName) {
    displayName = displayNameFromUser(user)
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
    })
    throwIf(upsertError)
  }

  return {
    id: user.id,
    displayName,
    email: user.email ?? '',
  }
}

export const store = {
  async loadLibrary(): Promise<Library> {
    const user = await requireUser()
    const sessionUser = await sessionUserFrom(user)

    const [relativesRes, storiesRes] = await Promise.all([
      supabase.from('relatives').select('id, user_id, name, relationship').order('name'),
      supabase.from('stories').select('id, user_id, relative_id, title, prompt, body, created_at').order('created_at', { ascending: false }),
    ])

    throwIf(relativesRes.error)
    throwIf(storiesRes.error)

    return {
      user: sessionUser,
      relatives: (relativesRes.data ?? []).map(mapRelative),
      stories: (storiesRes.data ?? []).map(mapStory),
    }
  },

  async signup(email: string, password: string): Promise<AuthResult> {
    const address = email.trim()
    if (!address) return { ok: false, error: 'Add your email to sign up.' }
    if (!password) return { ok: false, error: 'Add a password to sign up.' }
    if (password.length < 6) return { ok: false, error: 'Use at least 6 characters for your password.' }

    const { data, error } = await supabase.auth.signUp({
      email: address,
      password,
    })
    if (error) return { ok: false, error: mapAuthMessage(error.message) }
    return { ok: true, needsConfirmation: !data.session }
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const address = email.trim()
    if (!address) return { ok: false, error: 'Add your email to log in.' }
    if (!password) return { ok: false, error: 'Add your password to log in.' }

    const { error } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    })
    if (error) return { ok: false, error: mapAuthMessage(error.message) }
    return { ok: true, needsConfirmation: false }
  },

  async resendSignupConfirmation(email: string) {
    const address = email.trim()
    if (!address) throw new StoreError('Add your email to continue.')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: address,
    })
    throwIf(error)
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    throwIf(error)
  },

  async updateDisplayName(displayName: string): Promise<SessionUser> {
    const user = await requireUser()
    const name = displayName.trim()
    if (!name) throw new StoreError('Add your name to continue.')

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: name,
    })
    throwIf(profileError)

    const { error: metaError } = await supabase.auth.updateUser({
      data: { display_name: name },
    })
    throwIf(metaError)

    return sessionUserFrom(user)
  },

  async saveRelative(input: { id?: string; name: string; relationship: string }): Promise<Relative> {
    const user = await requireUser()
    const name = input.name.trim()
    const relationship = input.relationship.trim()
    if (!name) throw new StoreError('Add their name before saving.')
    if (!relationship) throw new StoreError('Add their relationship to you before saving.')

    if (input.id) {
      const { data, error } = await supabase
        .from('relatives')
        .update({ name, relationship })
        .eq('id', input.id)
        .select('id, user_id, name, relationship')
        .single()
      throwIf(error)
      if (!data) throw new StoreError('Could not save that person.')
      return mapRelative(data)
    }

    const { data, error } = await supabase
      .from('relatives')
      .insert({ user_id: user.id, name, relationship })
      .select('id, user_id, name, relationship')
      .single()
    throwIf(error)
    if (!data) throw new StoreError('Could not save that person.')
    return mapRelative(data)
  },

  async saveStory(input: {
    id?: string
    relativeId: string
    title: string
    prompt: string
    text: string
  }): Promise<Story> {
    const user = await requireUser()
    const title = input.title.trim()
    const prompt = input.prompt.trim()
    const body = input.text.trim()
    if (!body) throw new StoreError('Write something you want to remember before saving.')

    if (input.id) {
      const { data, error } = await supabase
        .from('stories')
        .update({
          relative_id: input.relativeId,
          title,
          prompt,
          body,
        })
        .eq('id', input.id)
        .select('id, user_id, relative_id, title, prompt, body, created_at')
        .single()
      throwIf(error)
      if (!data) throw new StoreError('Could not save that story.')
      return mapStory(data)
    }

    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        relative_id: input.relativeId,
        title,
        prompt,
        body,
      })
      .select('id, user_id, relative_id, title, prompt, body, created_at')
      .single()
    throwIf(error)
    if (!data) throw new StoreError('Could not save that story.')
    return mapStory(data)
  },

  async deleteStory(storyId: string) {
    await requireUser()
    const { error } = await supabase.from('stories').delete().eq('id', storyId)
    throwIf(error)
  },

  async deleteRelative(relativeId: string) {
    await requireUser()
    const { error } = await supabase.from('relatives').delete().eq('id', relativeId)
    throwIf(error)
  },
}
