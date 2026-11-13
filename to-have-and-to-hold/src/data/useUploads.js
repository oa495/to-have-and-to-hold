import { cachedUploads, loadUploads } from './cheta.js'
import { useLoaded } from './useLoaded.js'

// { status: 'loading' | 'ready' | 'error', uploads }
export function useUploads() {
  const { status, items } = useLoaded(loadUploads, cachedUploads)
  return { status, uploads: items }
}
