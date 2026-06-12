import { useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'

interface GhostInputProps {
    value:     string
    onChange:  (val: string) => void
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
    disabled?: boolean
    placeholder?: string
}

export function GhostInput({ value, onChange, onKeyDown, disabled, placeholder }: GhostInputProps) {
    const ref = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
    }, [value])

    return (
        <div className="relative cursor-text" onClick={() => { ref.current?.focus() }}>
            <textarea
                ref={ref}
                value={value}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { onChange(e.target.value) }}
                onKeyDown={onKeyDown}
                rows={1}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full resize-none overflow-hidden bg-transparent border-none outline-none ring-0 text-sm text-fg-primary placeholder:text-fg-ghost disabled:opacity-40"
            />
        </div>
    )
}
