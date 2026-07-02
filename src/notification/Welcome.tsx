import {useEffect, useState} from 'react'

export function Welcome() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false) }, 3000)
    return () => { clearTimeout(t) }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`
        fixed bottom-4 right-4 flex items-center gap-2.5
        px-4 py-2.5 rounded-xl border border-hair
        bg-overlay/90 backdrop-blur-xl shadow-2xl
        transition-opacity duration-500
        ${'opacity-100'}
      `}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
      <p className="text-xs font-medium text-fg-primary">Notifications running</p>
    </div>
  )
}
