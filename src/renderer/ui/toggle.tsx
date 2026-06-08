import { cn } from '@/utils'

interface ToggleProps {
  checked:   boolean
  onChange:  (checked: boolean) => void
  className?: string
}

export function Toggle({ checked, onChange, className }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => { onChange(!checked) }}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-purple-600' : 'bg-zinc-700',
        className,
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0',
      )} />
    </button>
  )
}
