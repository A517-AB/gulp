import { Component, type PropsWithChildren } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

interface BoundaryState {
  error: Error | null
}

class AppRuntimeBoundary extends Component<PropsWithChildren, BoundaryState> {
  override state: BoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  override render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen px-6 py-8 text-stone-900">
          <section className="mx-auto grid max-w-4xl gap-6 rounded-[28px] border border-stone-950/10 bg-white/80 p-8 shadow-[0_24px_60px_rgba(41,30,16,0.14)] backdrop-blur">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
                Runtime boundary
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.06em] text-stone-950">
                The renderer caught a crash before it could take the shell down.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-stone-700">
                Keep this boundary in place while the route tree and the Electron bridge are still
                moving. Once the app surface settles and you have coverage around the hot paths, you
                can decide whether this stays as your permanent outer guard.
              </p>
            </div>

            <div className="rounded-3xl border border-red-950/10 bg-red-50/90 p-5 text-sm text-red-900">
              <p className="font-semibold">{this.state.error.message}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
                onClick={() => {
                  window.location.reload()
                }}
              >
                Reload app
              </button>
              <a
                href="#/"
                className="inline-flex items-center rounded-full border border-stone-950/10 px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-950/20 hover:bg-white"
              >
                Return home
              </a>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

function App() {
  return (
    <AppRuntimeBoundary>
      <RouterProvider router={router} />
    </AppRuntimeBoundary>
  )
}

export default App
