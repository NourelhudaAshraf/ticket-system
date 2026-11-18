import { useIsFetching } from '../../api/fetchingStore.js'

// A thin animated gradient bar across the top of the screen while any API request is running
// (loading a list, saving a form, signing in...). Pages still show their own skeletons and button
// spinners; this bar just tells the user "something is happening" everywhere, including reloads.
export default function FetchingBar() {
  const fetching = useIsFetching()

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden={!fetching}
      className={`pointer-events-none fixed inset-x-0 top-0 z-60 h-[0.1875rem] overflow-hidden transition-opacity duration-300 ${fetching ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="fetching-bar h-full w-1/3 rounded-full bg-linear-to-r from-sky-400 via-indigo-500 to-purple-500" />
    </div>
  )
}
