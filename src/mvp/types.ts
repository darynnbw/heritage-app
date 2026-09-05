export type SessionUser = {
  id: string
  displayName: string
  email: string
}

export type Relative = {
  id: string
  userId: string
  name: string
  relationship: string
}

export type Story = {
  id: string
  userId: string
  relativeId: string
  title: string
  prompt: string
  text: string
  createdAt: string
}

export type Screen =
  | 'welcome'
  | 'login'
  | 'signup'
  | 'onboarding-intro'
  | 'onboarding-name'
  | 'onboarding-relative'
  | 'onboarding-story'
  | 'home'
  | 'people'
  | 'add-relative'
  | 'edit-relative'
  | 'relative'
  | 'story'
  | 'write'
  | 'settings'
  | 'not-found'

export type Tab = 'home' | 'people' | 'settings'
