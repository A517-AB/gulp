import { useRef, useState, type KeyboardEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GhostInputProps {
  value: string
  onChange: (val: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  disabled?: boolean
}

export function GhostInput({ value, onChange, onKeyDown, placeholder, disabled }: GhostInputProps) {
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  return (
    <div
      className="relative cursor-text"
      onClick={() => ref.current?.focus()}
    >
      {/* Border beam */}
      <AnimatePresence>
        {focused && (
          <motion.div
            key="beam"
            className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'conic-gradient(from 0deg, transparent 80%, oklch(0.75 0.12 290 / 0.8) 90%, transparent 95%)',
                borderRadius: 'inherit',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            {/* Mask to show only border */}
            <div
              className="absolute inset-[1px] rounded-[calc(0.5rem-1px)] bg-base"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        ref={ref}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="relative z-10 w-full resize-none bg-transparent border-none outline-none ring-0 text-sm text-fg-primary placeholder:text-fg-ghost transition-opacity duration-300"
        style={{ opacity: focused || value ? 1 : 0 }}
      />
    </div>
  )
}
