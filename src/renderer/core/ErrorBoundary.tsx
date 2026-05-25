import { Component, type ReactNode, type ErrorInfo } from 'react'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router'

// ── Shared display ────────────────────────────────────────────────────────────

interface ErrorScreenProps {
  status: number
  title: string
  message: string
  onHome?: () => void
  onReset?: () => void
}

function ErrorScreen({ status, title, message, onHome, onReset }: ErrorScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 select-none">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold text-destructive">{status}</span>
        <div className="w-px h-8 bg-hair" />
        <span className="text-sm text-fg-secondary">{title}</span>
      </div>
      <p className="text-xs text-fg-muted max-w-sm text-center">{message}</p>
      <div className="flex gap-2 mt-2">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-1.5 text-xs text-fg-secondary bg-hover hover:bg-active border border-hair rounded-md transition-colors"
          >
            Try again
          </button>
        )}
        {onHome && (
          <button
            type="button"
            onClick={onHome}
            className="px-4 py-1.5 text-xs text-fg-secondary bg-hover hover:bg-active border border-hair rounded-md transition-colors"
          >
            Go home
          </button>
        )}
      </div>
    </div>
  )
}

// ── Route error boundary (errorElement in router) ────────────────────────────

function resolveRouteError(error: unknown): { status: number; title: string; message: string } {
  if (isRouteErrorResponse(error)) {
    return {
      status:  error.status,
      title:   error.status === 404 ? 'Page not found' : `Error ${error.status}`,
      message: error.status === 404
        ? "The page you're looking for doesn't exist."
        : (error.statusText || 'An unexpected error occurred.'),
    }
  }
  if (error instanceof Error) {
    const missing =
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Cannot find module') ||
      error.message.includes('does not provide an export named')
    if (missing) {
      return { status: 404, title: 'Page unavailable', message: 'This page could not be loaded — it may have been removed or renamed.' }
    }
    return { status: 500, title: 'Something went wrong', message: error.message }
  }
  return { status: 500, title: 'Something went wrong', message: 'An unexpected error occurred.' }
}

export function RouteErrorBoundary(): ReactNode {
  const error: unknown = useRouteError()
  const navigate = useNavigate()
  const { status, title, message } = resolveRouteError(error)

  if (import.meta.env.DEV) {
    console.error('[RouteErrorBoundary]', error)
  }

  return (
    <ErrorScreen
      status={status}
      title={title}
      message={message}
      onHome={() => { void navigate('/') }}
    />
  )
}

// ── Class-based boundary (wraps subtrees, catches render errors) ──────────────

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] render error:', error.message)
    if (import.meta.env.DEV) {
      console.error(info.componentStack)
    }
  }

  reset = () => { this.setState({ error: null }) }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <ErrorScreen
        status={500}
        title="Something went wrong"
        message={error.message}
        onReset={this.reset}
      />
    )
  }
}
