import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MdNotificationProps {
  /** Bumps whenever fresh markdown arrives; any change > 0 triggers the toast. */
  trigger: number
}

export function MdNotification({ trigger }: MdNotificationProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (trigger <= 0) return
    // setState only inside async callbacks — avoids synchronous setState in effect body.
    const show = requestAnimationFrame(() => { setVisible(true) })
    const hide = setTimeout(() => { setVisible(false) }, 3000)
    return () => { cancelAnimationFrame(show); clearTimeout(hide) }
  }, [trigger])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-fg-ghost" />
          <span className="text-[10px] font-mono tracking-widest uppercase text-fg-ghost">
            markdown received
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
