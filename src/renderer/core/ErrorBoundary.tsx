import {Component, type ErrorInfo, Fragment, type ReactNode, useState} from 'react'
import {isRouteErrorResponse, useNavigate, useRouteError} from 'react-router'

// ── Copy helper ───────────────────────────────────────────────────────────────

function CopyButton({text}: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            type="button"
            onClick={() => {
                void navigator.clipboard.writeText(text).then(() => {
                    setCopied(true)
                    setTimeout(() => {
                        setCopied(false)
                    }, 2000)
                })
            }}
            className="px-3 py-1.5 text-xs text-fg-secondary bg-hover hover:bg-active border border-hair rounded-md transition-colors"
        >
            {copied ? 'Copied!' : 'Copy error'}
        </button>
    )
}

// ── Shared display ────────────────────────────────────────────────────────────

interface ErrorScreenProps {
  status: number
  title: string
  message: string
    stack?: string | undefined
  onHome?: () => void
  onReset?: () => void
}

function ErrorScreen({status, title, message, stack, onHome, onReset}: ErrorScreenProps) {
    const copyText = stack
        ? `${String(status)} ${title}\n${message}\n\n${stack}`
        : `${String(status)} ${title}\n${message}`

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 select-none">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold text-destructive">{status}</span>
        <div className="w-px h-8 bg-hair" />
        <span className="text-sm text-fg-secondary">{title}</span>
      </div>
        <p className="text-xs text-fg-muted max-w-sm text-center select-text">{message}</p>

        {import.meta.env.DEV && stack && (
            <details className="max-w-lg w-full">
                <summary className="text-xs text-fg-ghost cursor-pointer hover:text-fg-dim select-none">Stack trace
                </summary>
                <pre
                    className="mt-2 p-3 rounded-md bg-raised border border-hair text-3xs font-mono text-fg-muted overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">
            {stack}
          </pre>
            </details>
        )}

        <div className="flex gap-2 mt-2 flex-wrap justify-center">
            <CopyButton text={copyText}/>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 text-xs text-fg-secondary bg-hover hover:bg-active border border-hair rounded-md transition-colors"
          >
            Try again
          </button>
        )}
        {onHome && (
          <button
            type="button"
            onClick={onHome}
            className="px-3 py-1.5 text-xs text-fg-secondary bg-hover hover:bg-active border border-hair rounded-md transition-colors"
          >
            Go home
          </button>
        )}
            <button
                type="button"
                onClick={() => {
                    window.location.reload()
                }}
                className="px-3 py-1.5 text-xs text-fg-secondary bg-hover hover:bg-active border border-hair rounded-md transition-colors"
            >
                Reload
            </button>
      </div>
    </div>
  )
}

// ── Route error boundary (errorElement in router) ────────────────────────────

function resolveRouteError(error: unknown): {
    status: number;
    title: string;
    message: string;
    stack?: string | undefined
} {
  if (isRouteErrorResponse(error)) {
    return {
      status:  error.status,
        title: error.status === 404 ? 'Page not found' : `Error ${String(error.status)}`,
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
      return {status: 500, title: 'Something went wrong', message: error.message, stack: error.stack}
  }
  return { status: 500, title: 'Something went wrong', message: 'An unexpected error occurred.' }
}

export function RouteErrorBoundary(): ReactNode {
  const error: unknown = useRouteError()
  const navigate = useNavigate()
    const {status, title, message, stack} = resolveRouteError(error)

  if (import.meta.env.DEV) {
    console.error('[RouteErrorBoundary]', error)
  }

  return (
    <ErrorScreen
      status={status}
      title={title}
      message={message}
      stack={stack}
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
    stack: string | null
    resetKey: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    override state: ErrorBoundaryState = {error: null, stack: null, resetKey: 0}

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
        console.error('[ErrorBoundary] render error:', error.message)
      console.error(errorInfo.componentStack)
    }
      this.setState({stack: errorInfo.componentStack ?? error.stack ?? null})
  }

    reset = () => {
        this.setState(s => ({error: null, stack: null, resetKey: s.resetKey + 1}))
    }

  override render() {
      const {error, stack, resetKey} = this.state
      if (!error) {
          return <Fragment key={resetKey}>{this.props.children}</Fragment>
      }
    if (this.props.fallback) return this.props.fallback
    return (
      <ErrorScreen
        status={500}
        title="Something went wrong"
        message={error.message}
        stack={stack ?? error.stack ?? undefined}
        onReset={this.reset}
      />
    )
  }
}
