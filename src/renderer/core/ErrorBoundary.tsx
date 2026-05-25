import type { ReactNode } from 'react'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router'

interface ErrorDisplay {
    readonly status:  number
    readonly title:   string
    readonly message: string
}

function resolveError(error: unknown): ErrorDisplay {
    if (isRouteErrorResponse(error)) {
        return {
            status:  error.status,
            title:   error.status === 404 ? 'Page not found' : `Error ${String(error.status)}`,
            message: error.status === 404
                ? "The page you're looking for doesn't exist."
                : (error.statusText || 'An unexpected error occurred.'),
        }
    }

    if (error instanceof Error) {
        return { status: 500, title: 'Something went wrong', message: error.message }
    }

    return { status: 500, title: 'Something went wrong', message: 'An unexpected error occurred.' }
}

export function ErrorBoundary(): ReactNode {
    const error: unknown = useRouteError()
    const navigate = useNavigate()
    const { status, title, message } = resolveError(error)

    const handleGoHome = (): void => { void navigate('/') }

    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 select-none">
            <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-destructive">{status}</span>
                <div className="w-px h-8 bg-hair" />
                <span className="text-sm text-fg-secondary">{title}</span>
            </div>

            <p className="text-xs text-fg-muted max-w-sm text-center">{message}</p>

            <button
                type="button"
                onClick={handleGoHome}
                className="mt-2 px-4 py-1.5 text-xs text-fg-secondary bg-hover hover:bg-active border border-hair rounded-md transition-colors"
            >
                Go home
            </button>
        </div>
    )
}