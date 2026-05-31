import type { ReactNode, SVGProps } from 'react'

export interface LanguagePreset {
  id: string
  name: string
  icon: (props: SVGProps<SVGSVGElement>) => ReactNode
  color: string
}

export type SnippetCategory = 'standard' | 'jules'

// HANDOFF: Jules snippet extensions go here.
// When category === 'workspace', a snippet can carry attached tools/context
// that gets formatted as text and sent to Jules alongside the script.
// Jules does not accept files — everything must be serialized as plain text.

export interface JulesSnippetMeta {
  /** Brief description shown in the picker UI */
  description?: string;
  /** Whether this snippet is a strict instruction directive vs just helpful context */
  isInstruction?: boolean;
}
export interface Snippet {
  id: string
  title: string | null
  languageId: string | null
  script: string // STRICTLY REQUIRED
  createdAt: string
  category?: SnippetCategory
  tags?: string[]
  julesMeta?: JulesSnippetMeta
}
