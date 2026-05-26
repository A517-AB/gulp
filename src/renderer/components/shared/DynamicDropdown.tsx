import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/ui/popover'
import { cn } from '@/utils'

export interface DropdownItem {
  id: string
  label: string
  icon?: React.FC<React.SVGProps<SVGSVGElement>>
  colorHue?: string
}

export interface DynamicDropdownProps {
  items: DropdownItem[]
  value?: string | null
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DynamicDropdown({ items, value, onChange, placeholder = "Select...", className }: DynamicDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const selected = items.find(item => item.id === value)

  const TriggerIcon = selected?.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center size-8 rounded-md transition-colors hover:bg-hover border border-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          style={{ color: selected?.colorHue || 'var(--fg-secondary)' }}
          title={selected?.label || placeholder}
        >
          {TriggerIcon ? (
            <TriggerIcon className="size-4" />
          ) : (
            <span className="text-xs font-medium px-2 truncate">
              {selected ? selected.label : placeholder}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <AnimatePresence>
        {open && (
          <PopoverContent
            asChild
            forceMount
            align="start"
            className="w-48 p-1 overflow-hidden"
            sideOffset={8}
          >
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="z-50 bg-overlay border border-subtle rounded-md shadow-lg"
            >
              <div className="flex flex-col">
                {items.map((item) => {
                  const ItemIcon = item.icon
                  const isSelected = item.id === value
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChange(item.id)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm transition-colors w-full text-left",
                        isSelected ? "bg-selected text-fg-primary" : "hover:bg-hover text-fg-secondary"
                      )}
                    >
                      {ItemIcon && (
                        <ItemIcon 
                          className="size-4 shrink-0" 
                          style={{ color: item.colorHue || 'currentColor' }} 
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  )
}
