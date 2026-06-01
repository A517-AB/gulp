import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/ui/popover'
import { cn } from '@/utils'

export interface DropdownItem {
  id: string
  label: string
  icon?: React.FC<React.SVGProps<SVGSVGElement>>
  color?: string
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
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)
  const selected = items.find(item => item.id === value)

  const TriggerIcon = selected?.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center size-9 rounded-lg transition-all hover:bg-hover active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring relative",
            className
          )}
          style={{ color: selected?.color || 'var(--fg-secondary)' }}
          title={selected?.label || placeholder}
        >
          {TriggerIcon ? (
            <TriggerIcon className="size-5" />
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
            className="w-48 p-0 overflow-hidden bg-transparent border-none"
            sideOffset={8}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, scale: 0.98, filter: "blur(2px)" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="z-50 bg-overlay/90 backdrop-blur-xl border border-subtle rounded-xl shadow-xl overflow-hidden"
              onMouseLeave={() => { setHoveredId(null); }}
            >
              <div className="flex flex-col p-1.5 relative z-10">
                {items.map((item, i) => {
                  const ItemIcon = item.icon
                  const isSelected = item.id === value
                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 24 }}
                      onClick={() => {
                        onChange(item.id)
                        setOpen(false)
                      }}
                      onMouseEnter={() => { setHoveredId(item.id); }}
                      className={cn(
                        "relative flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-colors w-full text-left outline-none",
                        isSelected ? "text-fg-primary font-medium" : "text-fg-secondary"
                      )}
                    >
                      {hoveredId === item.id && (
                        <motion.div
                          layoutId="dropdown-hover"
                          className="absolute inset-0 bg-hover rounded-lg -z-10"
                          initial={false}
                          transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                        />
                      )}

                      {ItemIcon && (
                        <ItemIcon 
                          className="size-4 shrink-0 transition-transform duration-200"
                          style={{
                            color: item.color || 'currentColor',
                            transform: hoveredId === item.id ? "scale(1.15)" : "scale(1)"
                          }}
                        />
                      )}
                      <span className="truncate">{item.label}</span>

                      {isSelected && (
                        <motion.div
                          layoutId="dropdown-active-dot"
                          className="absolute right-3 size-1.5 rounded-full"
                          style={{ backgroundColor: item.color || 'var(--color-primary, currentColor)' }}
                        />
                      )}
                    </motion.button>
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
