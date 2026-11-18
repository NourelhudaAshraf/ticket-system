import { useSyncExternalStore } from 'react'

// Counts API requests that are still running. client.js calls start() before each request and
// done() when it finishes (success or error). React components read it with useIsFetching().
// A tiny store outside React (like a module-level variable in Node) so axios can update it.
let pending = 0
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

export function start() {
  pending++
  notify()
}

export function done() {
  pending = Math.max(0, pending - 1)
  notify()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// true while at least one request is running. Re-renders the component when that changes.
export function useIsFetching() {
  return useSyncExternalStore(subscribe, () => pending > 0)
}
