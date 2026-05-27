import type { ReactNode, SVGProps } from 'react'

export interface LanguagePreset {
  id: string
  name: string
  icon: (props: SVGProps<SVGSVGElement>) => ReactNode
  color: string
}

export interface Snippet {
  id: string
  title: string | null
  languageId: string | null
  script: string // STRICTLY REQUIRED
  createdAt: string
}
