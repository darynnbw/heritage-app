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

export type User = {
  username: string
  password: string
}

export type HeritageDB = {
  users: User[]
  relatives: Relative[]
  stories: Story[]
}

export type Screen =
  | 'login'
  | 'signup'
  | 'onboarding-intro'
  | 'onboarding-relative'
  | 'onboarding-story'
  | 'home'
  | 'people'
  | 'relative'
  | 'story'
  | 'write'
  | 'settings'

export type Tab = 'home' | 'people' | 'settings'
