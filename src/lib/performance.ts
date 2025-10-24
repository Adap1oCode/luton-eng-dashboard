// Performance monitoring for auth flows
export const measureAuthPerformance = () => {
  if (typeof window !== 'undefined') {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart
    
    console.log('Auth page load time:', loadTime)
    return loadTime
  }
  return 0
}

export const trackAuthPerformance = (metrics?: {
  pageLoadTime?: number
  authFormRenderTime?: number
  apiResponseTime?: number
  totalAuthTime?: number
}) => {
  const loadTime = metrics?.pageLoadTime || measureAuthPerformance()
  
  // Track with analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'auth_performance', {
      load_time: loadTime,
      page_type: 'auth',
      ...metrics
    })
  }
  
  return loadTime
}

export const measureFormSubmissionTime = (startTime: number) => {
  const endTime = performance.now()
  const submissionTime = endTime - startTime
  
  console.log('Form submission time:', submissionTime)
  
  // Track with analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'form_submission_time', {
      duration: submissionTime,
      form_type: 'auth'
    })
  }
  
  return submissionTime
}

export const trackCoreWebVitals = () => {
  if (typeof window !== 'undefined' && (window as any).webVitals) {
    (window as any).webVitals.getCLS((metric: any) => {
      console.log('CLS:', metric.value)
    })
    
    (window as any).webVitals.getFID((metric: any) => {
      console.log('FID:', metric.value)
    })
    
    (window as any).webVitals.getLCP((metric: any) => {
      console.log('LCP:', metric.value)
    })
  }
}

// Additional performance measurement functions
export const measurePageLoad = () => {
  if (typeof window !== 'undefined') {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return navigation.loadEventEnd - navigation.loadEventStart
  }
  return 0
}

export const measureApiResponse = async <T>(apiCall: () => Promise<T>) => {
  const startTime = performance.now()
  const result = await apiCall()
  const endTime = performance.now()
  const responseTime = endTime - startTime
  
  return { result, responseTime }
}