import { cachedEvents, loadEvents } from './cheta.js'
import { useLoaded } from './useLoaded.js'

// { status: 'loading' | 'ready' | 'error', events }
export function useEvents() {
  const { status, items } = useLoaded(loadEvents, cachedEvents)
  return { status, events: items }
}
