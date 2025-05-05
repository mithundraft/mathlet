'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Application Error:", error)
  }, [error])

  return (
    <html lang="en">
      <body>
         {/* Use `main` for semantic content */}
         <main role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mb-4" aria-hidden="true"/>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Something went wrong!</h1>
             <p className="text-muted-foreground mb-6 text-center max-w-md text-sm md:text-base">
                We encountered an unexpected error. Please try refreshing the page. If the problem persists, please contact support.
                {error?.message && process.env.NODE_ENV === 'development' && (
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
                // Attempt to recover by trying to re-render the root route
                () => reset()
              }
              aria-label="Try loading the application again"
            >
              Try again
            </Button>
          </main>
      </body>
    </html>
  )
}
