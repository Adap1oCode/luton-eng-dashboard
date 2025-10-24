import { NextRequest } from 'next/server'

// In-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, number[]>()

export function rateLimit(
  identifier: string, 
  limit: number = 5, 
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Get existing requests for this identifier
  const requests = rateLimitMap.get(identifier) || []
  
  // Filter out old requests outside the window
  const validRequests = requests.filter((time: number) => time > windowStart)
  
  // Check if limit exceeded
  if (validRequests.length >= limit) {
    return false
  }
  
  // Add current request
  validRequests.push(now)
  rateLimitMap.set(identifier, validRequests)
  
  return true
}

export function getRateLimitInfo(identifier: string, limit: number = 5, windowMs: number = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  const requests = rateLimitMap.get(identifier) || []
  const validRequests = requests.filter((time: number) => time > windowStart)
  
  return {
    remaining: Math.max(0, limit - validRequests.length),
    resetTime: validRequests.length > 0 ? validRequests[0] + windowMs : now,
    limit
  }
}

export function clearRateLimit(identifier: string) {
  rateLimitMap.delete(identifier)
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  const oneHourAgo = now - 3600000 // 1 hour
  
  for (const [key, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter((time: number) => time > oneHourAgo)
    if (validRequests.length === 0) {
      rateLimitMap.delete(key)
    } else {
      rateLimitMap.set(key, validRequests)
    }
  }
}, 300000) // Clean up every 5 minutes