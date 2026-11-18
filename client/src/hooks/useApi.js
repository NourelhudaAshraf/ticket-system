import { useCallback, useEffect, useState } from 'react'

// Loads data for a page: runs `fetcher` (a function returning a promise) when the component mounts
// and whenever a value in `deps` changes, and tracks { data, loading, error } for you.
// `reload()` runs it again, e.g. after saving a change.
//
// If deps change while a request is still running, the older response is ignored when it arrives,
// so a slow first request can never overwrite the newer result.
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let isLatest = true

    // Keep showing the old data while the new request runs (no flicker on reload).
    Promise.resolve()
      .then(() => {
        if (isLatest) setState((previous) => ({ ...previous, loading: true, error: null }))
        return fetcher()
      })
      .then(
        (data) => isLatest && setState({ data, loading: false, error: null }),
        (error) => isLatest && setState((previous) => ({ ...previous, loading: false, error })),
      )

    return () => {
      isLatest = false
    }
    // The caller lists what the fetcher depends on, like useEffect's own dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return { ...state, reload }
}
