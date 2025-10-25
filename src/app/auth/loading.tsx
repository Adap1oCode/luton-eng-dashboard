import React from 'react'
import { Loader2 } from 'lucide-react'

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="mb-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-500" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Loading Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we prepare your login experience...
        </p>
      </div>
    </div>
  )
}
