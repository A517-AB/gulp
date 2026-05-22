import type { ReactNode } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router';

interface ErrorDisplay {
  readonly status: number;
  readonly title: string;
  readonly message: string;
}

function resolveError(error: unknown): ErrorDisplay {
  if (isRouteErrorResponse(error)) {
    return {
      status: error.status,
      title: error.status === 404 ? 'Page not found' : `Error ${String(error.status)}`,
      message:
        error.status === 404
          ? "The page you're looking for doesn't exist."
          : (error.statusText || 'An unexpected error occurred.'),
    };
  }

  if (error instanceof Error) {
    return { status: 500, title: 'Something went wrong', message: error.message };
  }

  return { status: 500, title: 'Something went wrong', message: 'An unexpected error occurred.' };
}

export default function ErrorBoundary(): ReactNode {
  const error = useRouteError();
  const navigate = useNavigate();
  const { status, title, message } = resolveError(error);

  const handleGoHome = (): void => {
    void navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 select-none">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold text-red-400/80">{status}</span>
        <div className="w-px h-8 bg-white/10" />
        <span className="text-sm text-neutral-400">{title}</span>
      </div>

      <p className="text-xs text-neutral-600 max-w-sm text-center">{message}</p>

      <button
        type="button"
        onClick={handleGoHome}
        className="mt-2 px-4 py-1.5 text-xs text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors"
      >
        Go home
      </button>
    </div>
  );
}
