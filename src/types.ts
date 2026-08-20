export type LocalizedString = string | { en: string; uk: string };

export interface Story {
  id: string;
  personId: string;
  title: LocalizedString;
  date: LocalizedString;
  content: LocalizedString;
  contributor: LocalizedString;
  image?: string;
}

export interface AudioClip {
  id: string;
  title: LocalizedString;
  duration: string;
  url?: string;
}

export interface Person {
  id: string;
  name: LocalizedString;
  relationship: LocalizedString;
  bio: LocalizedString;
  photo: string;
  x: number;
  y: number;
  audioClips?: AudioClip[];
  photos?: string[];
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  label: LocalizedString;
}
