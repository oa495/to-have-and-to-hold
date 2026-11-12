import { useEffect, useState } from 'react'
import { loadEvents } from './cheta.js'

// { status: 'loading' | 'ready' | 'error', events }
export function useEvents() {
  const [state, setState] = useState({ status: 'loading', events: [] })

  useEffect(() => {
    let active = true
    loadEvents().then(
      (events) => active && setState({ status: 'ready', events }),
      (error) => {
        console.error(error)
        if (active) setState({ status: 'error', events: [] })
      },
    )
    return () => {
      active = false
    }
  }, [])

  return state
}
