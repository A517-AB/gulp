import {motion} from 'framer-motion'
import { cn } from '@/utils'

interface ToggleProps {
    checked: boolean
    onChange: (checked: boolean) => void
    label?: string
    id?: string
  className?: string
}

export function Toggle({checked, onChange, label, id, className}: ToggleProps) {
    const btn = (
    <button
        type="button"
      role="switch"
        id={id}
      aria-checked={checked}
      onClick={() => { onChange(!checked) }}
      className={cn(
          'relative w-9 h-5 rounded-full shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200',
          checked ? 'bg-purple-600' : 'bg-white/10',
        className,
      )}
    >
        <motion.span
            layout
            transition={{type: 'spring', stiffness: 500, damping: 30}}
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
            style={{left: checked ? 'calc(100% - 18px)' : '2px'}}
        />
    </button>
  )

    if (!label) return btn

    return (
        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            {btn}
            <span className="text-xs text-fg-secondary group-hover:text-fg-primary transition-colors">{label}</span>
        </label>
    )
}
