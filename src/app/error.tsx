'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Unhandled Route Segment Error:", error)
  }, [error])

  return (
    <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.14))] bg-background text-foreground p-6 text-center">
      <AlertTriangle className="w-16 h-16 text-destructive mb-4" aria-hidden="true" />
      <h2 className="text-2xl md:text-3xl font-bold mb-2">Oops! Something went wrong.</h2>
      <p className="text-muted-foreground mb-6 max-w-md text-sm md:text-base">
        We encountered an error while trying to load this part of the application. Please try again.
        {process.env.NODE_ENV === 'development' && error?.message && (
          <span className="block text-xs mt-2 font-mono bg-muted p-2 text-left break-words">
            <strong>Error Details (Dev Mode):</strong>
            <br />
            {error.message}
            {error.digest && <span className="block mt-1">Digest: {error.digest}</span>}
          </span>
        )}
      </p>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        aria-label="Try loading the page again"
      >
        Try again
      </Button>
    </div>
  )
}
