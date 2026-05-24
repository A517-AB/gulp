import { Sun, Moon } from 'lucide-react'
import { Button } from '@/ui/button'
import { useTheme } from '@renderer/providers/theme'
import type { ReactNode } from 'react'

export function ThemeToggle(): ReactNode {
  const { theme, toggle } = useTheme()
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark'
        ? <Sun className="size-3.5" />
        : <Moon className="size-3.5" />
      }
    </Button>
  )
}
