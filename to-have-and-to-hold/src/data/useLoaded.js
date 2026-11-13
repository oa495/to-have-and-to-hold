import { useEffect, useState } from 'react'

// Runs an async loader once on mount: { status: 'loading' | 'ready' | 'error', items }.
// readSaved, if given, returns a saved copy (or null) to show straight away;
// the loader's result replaces it when it arrives. items is [] until there's
// something to show.
export function useLoaded(load, readSaved) {
  const [state, setState] = useState(() => {
    const saved = readSaved?.()
    return saved ? { status: 'ready', items: saved } : { status: 'loading', items: [] }
  })

  useEffect(() => {
    let active = true
    load().then(
      (items) => active && setState({ status: 'ready', items }),
      (error) => {
        console.error(error)
        // Keep a saved copy on screen if there is one.
        if (active) setState((s) => (s.status === 'ready' ? s : { status: 'error', items: [] }))
      },
    )
    return () => {
      active = false
    }
  }, [load])

  return state
}
