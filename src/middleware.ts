import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from './middleware/auth-middleware'

export function middleware(req: NextRequest) {
  // Optional: apply authentication middleware
  // const response = authMiddleware(req)
  // if (response) {
  //   return response
  // }

  const res = NextResponse.next()

  // 🔁 Inject the full request URL so server components can parse query params like ?range=
  res.headers.set('x-url', req.nextUrl.toString())

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/login'],
}
