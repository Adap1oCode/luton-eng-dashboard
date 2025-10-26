// Analytics tracking for auth events
export const trackAuthEvent = (event: string, properties?: Record<string, any>) => {
  // Track events in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics Event:', event, properties)
  }
  
  // Track with Google Analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, properties)
  }
}

export const trackLoginAttempt = (method: string = 'email') => {
  trackAuthEvent('login_attempt', { method })
}

export const trackLoginSuccess = (method: string = 'email') => {
  trackAuthEvent('login_success', { method })
}

export const trackLoginFailure = (method: string = 'email', error?: string) => {
  trackAuthEvent('login_failure', { method, error })
}

// Alias for backward compatibility
export const trackLoginFailed = trackLoginFailure

export const trackRegisterAttempt = (method: string = 'email') => {
  trackAuthEvent('register_attempt', { method })
}

export const trackRegisterSuccess = (method: string = 'email') => {
  trackAuthEvent('register_success', { method })
}

export const trackRegisterFailure = (method: string = 'email', error?: string) => {
  trackAuthEvent('register_failure', { method, error })
}

// Alias for backward compatibility
export const trackRegisterFailed = trackRegisterFailure

export const trackMagicLinkSent = (email: string) => {
  trackAuthEvent('magic_link_sent', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') })
}

export const trackPasswordReset = () => {
  trackAuthEvent('password_reset_requested')
}

export const trackAuthError = (error: Error | string, context: string) => {
  const errorMessage = error instanceof Error ? error.message : error
  trackAuthEvent('auth_error', { error: errorMessage, context })
}