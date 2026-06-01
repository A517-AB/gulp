import { useRef, type KeyboardEvent, type ChangeEvent } from 'react'

interface GhostInputProps {
  value: string
  onChange: (val: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  disabled?: boolean
}

export function GhostInput({ value, onChange, onKeyDown, disabled }: GhostInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="relative cursor-text" onClick={() => ref.current?.focus()}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { onChange(e.target.value) }}
        onKeyDown={onKeyDown}
        rows={1}
        disabled={disabled}
        className="w-full resize-none bg-transparent border-none outline-none ring-0 text-sm text-fg-primary"
      />
    </div>
  )
}
