import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals'

export function reportWebVitals() {
  if (typeof window === 'undefined') return

  onCLS((metric) => {
    // This tracks layout stability (how much the page shifts)
    console.log('CLS:', metric.value)
  })

  onLCP((metric) => {
    // This tracks how fast the main content loads
    console.log('LCP:', metric.value)
  })

  onFCP((metric) => {
    // This tracks when first content appears
    console.log('FCP:', metric.value)
  })

  onINP((metric) => {
    // This tracks how responsive the page feels
    console.log('INP:', metric.value)
  })

  onTTFB((metric) => {
    // This tracks server response time
    console.log('TTFB:', metric.value)
  })
}

