import { useState, useEffect } from 'react'
import ReactClock from 'react-clock'
import 'react-clock/dist/Clock.css'

interface ClockProps {
  size?: number
  className?: string
}

export function Clock({ size = 240, className }: ClockProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => { setTime(new Date()) }, 1000)
    return () => { clearInterval(id) }
  }, [])

  return (
    <>
      <style>{`
        .react-clock__face { border-color: rgba(255,255,255,0.08); background: transparent; }
        .react-clock__mark__body { background-color: rgba(255,255,255,0.2); }
        .react-clock__hour-mark__body { background-color: rgba(255,255,255,0.4); }
        .react-clock__hand__body { background-color: rgba(255,255,255,0.9); }
        .react-clock__second-hand__body { background-color: #00B4C4; }
      `}</style>
      <ReactClock
        value={time}
        size={size}
        className={className}
        renderNumbers={false}
        secondHandWidth={1.5}
        minuteHandWidth={2}
        hourHandWidth={3}
        hourHandLength={45}
        minuteHandLength={65}
        secondHandLength={85}
        secondHandOppositeLength={15}
      />
    </>
  )
}
