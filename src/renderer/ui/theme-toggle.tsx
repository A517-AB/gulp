import { Sun, Moon } from 'lucide-react'
import { Button } from '@/ui/button'
import { useTheme } from '@renderer/providers/theme'
import type { ReactNode } from 'react'

export function ThemeToggle(): ReactNode {
    const { theme, toggle } = useTheme()
    const isDark = theme === 'dark'

    return (
        <Button
            size="icon-sm"
            variant="ghost"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative overflow-hidden"
        >
            <Sun
                className="absolute size-3.5 transition-all duration-200"
                style={{
                    opacity:   isDark ? 1 : 0,
                    transform: isDark ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-90deg)',
                }}
            />
            <Moon
                className="absolute size-3.5 transition-all duration-200"
                style={{
                    opacity:   isDark ? 0 : 1,
                    transform: isDark ? 'scale(0.5) rotate(90deg)' : 'scale(1) rotate(0deg)',
                }}
            />
            {/* keeps the button from collapsing — icons are absolute */}
            <span className="size-3.5 invisible" aria-hidden />
        </Button>
    )
}