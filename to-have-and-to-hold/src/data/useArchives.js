import { useEffect, useState } from 'react'
import { loadArchives } from './cheta.js'

const EMPTY = { events: [], uploads: [] }

// { status: 'loading' | 'ready' | 'error', events, uploads }
export function useArchives() {
  const [state, setState] = useState({ status: 'loading', ...EMPTY })

  useEffect(() => {
    let active = true
    loadArchives().then(
      (data) => active && setState({ status: 'ready', ...data }),
      (error) => {
        console.error(error)
        if (active) setState({ status: 'error', ...EMPTY })
      },
    )
    return () => {
      active = false
    }
  }, [])

  return state
}
