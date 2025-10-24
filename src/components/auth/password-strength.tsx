import React from 'react'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const calculateStrength = (password: string): number => {
    let strength = 0
    
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    
    return strength
  }

  const strength = calculateStrength(password)
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded ${
              level <= strength ? strengthColors[strength - 1] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-600">
        Password strength: {strengthLabels[strength - 1] || 'Very Weak'}
      </p>
      
      {/* Password rules checklist */}
      <div className="mt-2 space-y-1">
        <div className={`flex items-center text-xs ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{password.length >= 8 ? '✓' : '○'}</span>
          At least 8 characters
        </div>
        <div className={`flex items-center text-xs ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{/[a-z]/.test(password) ? '✓' : '○'}</span>
          Lowercase letter
        </div>
        <div className={`flex items-center text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
          Uppercase letter
        </div>
        <div className={`flex items-center text-xs ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{/[0-9]/.test(password) ? '✓' : '○'}</span>
          Number
        </div>
        <div className={`flex items-center text-xs ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-1">{/[^A-Za-z0-9]/.test(password) ? '✓' : '○'}</span>
          Special character
        </div>
      </div>
    </div>
  )
}