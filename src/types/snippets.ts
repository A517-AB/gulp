import type { ReactNode } from 'react'

export interface LanguagePreset {
  id: string
  name: string
  icon: (props: React.SVGProps<SVGSVGElement>) => ReactNode
  colorHue: string
}

export interface Snippet {
  id: string
  title: string | null
  languageId: string | null
  script: string // STRICTLY REQUIRED
  createdAt: string
}
