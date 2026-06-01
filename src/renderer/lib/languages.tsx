import { siPython, siJavascript, siTypescript, siGnubash, siJson, siMarkdown, siHtml5 } from 'simple-icons'
import type { SVGProps } from 'react'
import type { LanguagePreset } from '@/types/snippets'

function makeIcon(si: { path: string }) {
  return function SimpleIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d={si.path} />
      </svg>
    )
  }
}

// Jules SVG paths extracted from google-jules.svg, rewritten to use currentColor
function julesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="4.67 1.67 16.69 17.61" fill="currentColor" {...props}>
      <path d="M20.57,15.91c-0.46,0-0.84,0.38-0.84,0.84c0,0.46-0.38,0.84-0.84,0.84c-0.46,0-0.84-0.38-0.84-0.84v-4.21c0.08-0.23,0.15-0.46,0.15-0.69c0,0,0-4.74,0-4.9c0-2.91-2.3-5.28-5.2-5.28S7.72,4.05,7.72,6.96c0,0.15,0,4.9,0,4.9c0,0.31,0.08,0.61,0.31,0.92v3.98c0,0.46-0.38,0.84-0.84,0.84c-0.46,0-0.84-0.38-0.84-0.84c0-0.46-0.38-0.84-0.84-0.84c-0.46,0-0.84,0.38-0.84,0.84c0,1.3,1.07,2.37,2.37,2.52c0.08,0,0.08,0,0.15,0c0.08,0,0.08,0,0.15,0c1.3-0.08,2.37-1.15,2.37-2.52v-3.29c0,0-0.08-0.69,0.54-0.69c0.61,0,0.54,0.69,0.54,0.69v3.29c0,0.46,0.38,0.84,0.84,0.84c0.46,0,0.84-0.38,0.84-0.84v-3.29c0,0-0.15-0.69,0.54-0.69c0.69,0,0.54,0.69,0.54,0.69v3.29c0,0.46,0.38,0.84,0.84,0.84c0.46,0,0.84-0.38,0.84-0.84v-3.29c0,0-0.08-0.69,0.54-0.69c0.61,0,0.54,0.69,0.54,0.69v3.29c0,1.3,1.07,2.37,2.37,2.52c0.08,0,0.08,0,0.15,0s0.08,0,0.15,0c1.3-0.08,2.37-1.15,2.37-2.52C21.41,16.29,21.03,15.91,20.57,15.91z M10.24,11.16c-0.46,0-0.84-0.46-0.84-1.07c0-0.61,0.38-1.07,0.84-1.07c0.46,0,0.84,0.46,0.84,1.07C11.08,10.7,10.7,11.16,10.24,11.16z M15.83,11.16c-0.46,0-0.84-0.46-0.84-1.07c0-0.61,0.38-1.07,0.84-1.07c0.46,0,0.84,0.46,0.84,1.07C16.67,10.7,16.29,11.16,15.83,11.16z" />
    </svg>
  )
}

function pwshIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <defs>
        <linearGradient id="pwsh-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2671be" />
          <stop offset="100%" stopColor="#e8174c" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="3" fill="url(#pwsh-grad)" />
      <path
        d="M5.5 7.5 10.5 12 5.5 16.5M11 16.5h7"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export const LANGUAGES: LanguagePreset[] = [
  { id: 'python',     name: 'Python',     icon: makeIcon(siPython),     color: 'oklch(0.765 0.216 135.509)' },
  { id: 'javascript', name: 'JavaScript', icon: makeIcon(siJavascript), color: 'oklch(0.85 0.17 90)'  },
  { id: 'typescript', name: 'TypeScript', icon: makeIcon(siTypescript), color: 'oklch(0.6 0.15 250)'  },
  { id: 'bash',       name: 'Bash',       icon: makeIcon(siGnubash),    color: 'oklch(0.7 0.1 150)'   },
  { id: 'pwsh',       name: 'PowerShell', icon: pwshIcon,               color: 'oklch(0.6 0.15 260)'  },
  { id: 'json',       name: 'JSON',       icon: makeIcon(siJson),       color: 'oklch(0.7 0.1 30)'    },
  { id: 'markdown',   name: 'Markdown',   icon: makeIcon(siMarkdown),   color: 'oklch(0.75 0.08 220)' },
  { id: 'html',       name: 'HTML',       icon: makeIcon(siHtml5),      color: 'oklch(0.616 0.177 34.544)'   },
  { id: 'jules',      name: 'Jules',      icon: julesIcon,              color: 'oklch(0.405 0.185 295.245)' },
]

export function langFor(id: string | null) {
  return LANGUAGES.find(l => l.id === id)
}
