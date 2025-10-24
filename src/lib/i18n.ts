// Internationalization messages for auth
export const authMessages = {
  en: {
    login: 'Login',
    register: 'Register',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    rememberMe: 'Remember me for 30 days',
    createAccount: 'Create account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    forgotPassword: 'Forgot your password?',
    magicLinkSent: 'Magic link sent! Check your email.',
    loading: 'Loading...',
    error: 'Something went wrong',
    success: 'Success!',
    weak: 'Weak',
    good: 'Good',
    strong: 'Strong',
    veryWeak: 'Very Weak',
    fair: 'Fair'
  },
  es: {
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    email: 'Dirección de Correo',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    rememberMe: 'Recordarme por 30 días',
    createAccount: 'Crear cuenta',
    alreadyHaveAccount: '¿Ya tienes una cuenta?',
    dontHaveAccount: '¿No tienes una cuenta?',
    forgotPassword: '¿Olvidaste tu contraseña?',
    magicLinkSent: '¡Enlace mágico enviado! Revisa tu correo.',
    loading: 'Cargando...',
    error: 'Algo salió mal',
    success: '¡Éxito!',
    weak: 'Débil',
    good: 'Bueno',
    strong: 'Fuerte',
    veryWeak: 'Muy Débil',
    fair: 'Regular'
  }
}

export type Locale = keyof typeof authMessages

export function getAuthMessage(key: keyof typeof authMessages.en, locale: Locale = 'en'): string {
  return authMessages[locale][key] || authMessages.en[key]
}
