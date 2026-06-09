import {useEffect, useState} from 'react'
import ReactClock from 'react-clock'
import 'react-clock/dist/Clock.css'

interface ClockProps {
  size?: number
  className?: string
}

export function Clock({ size = 240, className }: ClockProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
      const id = setInterval(() => setTime(new Date()), 1000)
      return () => clearInterval(id)
  }, [])

  return (
    <>
      <style>{`
        .react-clock__face {
          border: none;
          background: transparent;
        }
        .react-clock__mark__body {
          background-color: rgba(255,255,255,0.12);
        }
        .react-clock__hour-mark__body {
          background-color: rgba(255,255,255,0.35);
        }
        .react-clock__minute-mark__body {
          display: none;
        }
        .react-clock__hand__body {
          background-color: currentColor;
          border-radius: 4px;
        }
        .react-clock__hour-hand__body {
          opacity: 0.85;
        }
        .react-clock__minute-hand__body {
          opacity: 0.75;
        }
        .react-clock__second-hand__body {
          background-color: #c0392b;
          width: 2px !important;
        }
        .react-clock__second-hand {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .react-clock__center-piece {
          background-color: #c0392b !important;
          width: 10px !important;
          height: 10px !important;
          border-radius: 50%;
        }
      `}</style>
      <ReactClock
        value={time}
        size={size}
        className={className}
        renderNumbers={false}
        secondHandWidth={2}
        minuteHandWidth={3}
        hourHandWidth={5}
        hourHandLength={45}
        minuteHandLength={65}
        secondHandLength={80}
        secondHandOppositeLength={15}
      />
    </>
  )
}
