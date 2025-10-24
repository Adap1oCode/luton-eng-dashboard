'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface AuthErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  React.useEffect(() => {
    // Log error for debugging
    console.error('Auth error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
        </div>
        
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Authentication Error
        </h2>
        
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Something went wrong with the authentication process. This might be a temporary issue.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Error Details (Development)
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </pre>
          </details>
        )}
        
        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full bg-orange-500 hover:bg-orange-600"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.location.href = '/auth/login'}
            className="w-full"
            size="lg"
          >
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  )
}
