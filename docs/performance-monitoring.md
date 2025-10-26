# Performance Monitoring Documentation

## 🚀 **Overview**

This document describes the comprehensive performance monitoring system implemented for the Luton Engineering Dashboard. The system tracks Core Web Vitals, React Query performance, and custom application metrics to ensure optimal user experience.

## 📊 **Features**

### **Core Web Vitals Monitoring**
- **CLS (Cumulative Layout Shift)**: Measures visual stability
- **FID (First Input Delay)**: Measures interactivity
- **FCP (First Contentful Paint)**: Measures loading performance
- **LCP (Largest Contentful Paint)**: Measures loading performance
- **TTFB (Time to First Byte)**: Measures server response time

### **React Query Performance**
- **Cache Hit Rate**: Percentage of queries served from cache
- **Query Performance**: Average query execution time
- **Mutation Performance**: Average mutation execution time
- **Stale Query Tracking**: Number of stale queries
- **Background Refetch Tracking**: Number of background updates

### **Custom Metrics**
- **API Response Time**: Custom API call performance
- **Render Time**: Component rendering performance
- **Memory Usage**: JavaScript heap usage
- **Cache Performance**: Application-specific caching metrics

## 🛠 **Implementation**

### **1. Performance Monitoring Hook**

```typescript
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring'

function MyComponent() {
  const { measureApiCall, logPerformanceSummary, getMetrics } = usePerformanceMonitoring()
  
  // Measure API calls
  const data = await measureApiCall(async () => {
    return fetch('/api/data').then(res => res.json())
  })
  
  // Log performance summary
  logPerformanceSummary()
}
```

### **2. React Query Performance Tracking**

```typescript
import { performanceMonitor } from '@/lib/react-query'

// Automatically tracks all React Query operations
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: () => performanceMonitor.trackQuery(['data'], fetchData)
})
```

### **3. Performance Dashboard**

Visit `/performance` to view the real-time performance dashboard with:
- Core Web Vitals metrics
- React Query performance statistics
- Performance budget violations
- Custom application metrics

## 📈 **Performance Budgets**

### **Core Web Vitals Thresholds**
- **CLS**: Good ≤0.1, Needs Improvement ≤0.25, Poor >0.25
- **FID**: Good ≤100ms, Needs Improvement ≤300ms, Poor >300ms
- **FCP**: Good ≤1.8s, Needs Improvement ≤3.0s, Poor >3.0s
- **LCP**: Good ≤2.5s, Needs Improvement ≤4.0s, Poor >4.0s
- **TTFB**: Good ≤800ms, Needs Improvement ≤1.8s, Poor >1.8s

### **React Query Thresholds**
- **Cache Hit Rate**: ≥80%
- **Average Query Time**: ≤500ms
- **Average Mutation Time**: ≤1000ms
- **Max Stale Queries**: ≤10

### **Custom Thresholds**
- **API Response Time**: ≤1000ms
- **Render Time**: ≤100ms
- **Memory Usage**: ≤50MB

## 🎯 **Usage Examples**

### **Basic Performance Monitoring**

```typescript
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring'

function DataComponent() {
  const { measureApiCall, logPerformanceSummary } = usePerformanceMonitoring()
  
  const fetchData = async () => {
    return measureApiCall(async () => {
      const response = await fetch('/api/data')
      return response.json()
    })
  }
  
  useEffect(() => {
    fetchData().then(() => {
      logPerformanceSummary()
    })
  }, [])
}
```

### **React Query with Performance Tracking**

```typescript
import { useQuery } from '@tanstack/react-query'
import { performanceMonitor } from '@/lib/react-query'

function useData() {
  return useQuery({
    queryKey: ['data'],
    queryFn: () => performanceMonitor.trackQuery(['data'], fetchData)
  })
}
```

### **Performance Budget Checking**

```typescript
import { checkPerformanceBudgets } from '@/hooks/use-performance-monitoring'

const metrics = getMetrics()
const budgetResults = checkPerformanceBudgets(metrics)

if (!budgetResults.passed) {
  console.warn('Performance budget violations:', budgetResults.violations)
}
```

## 📊 **Performance Dashboard**

The performance dashboard (`/performance`) provides:

1. **Real-time Metrics**: Live performance data
2. **Budget Violations**: Alerts for threshold breaches
3. **Historical Trends**: Performance over time
4. **React Query Stats**: Caching and query performance
5. **Custom Metrics**: Application-specific performance data

### **Dashboard Features**
- **Auto-refresh**: Updates every 5 seconds
- **Color-coded Metrics**: Green (good), Yellow (needs improvement), Red (poor)
- **Progress Bars**: Visual representation of performance
- **Violation Alerts**: Clear indication of budget violations

## 🧪 **Testing**

### **Run Performance Tests**

```bash
# Run performance monitoring tests
npm run performance:test

# View performance dashboard
npm run performance:monitor
```

### **Test Coverage**
- Performance budget validation
- Metric calculation accuracy
- Budget threshold verification
- Error handling for edge cases

## 🔧 **Configuration**

### **Performance Budgets**

Edit `src/hooks/use-performance-monitoring.ts` to adjust thresholds:

```typescript
export const PERFORMANCE_BUDGETS = {
  CLS: 0.1,
  FID: 100,
  FCP: 1800,
  LCP: 2500,
  TTFB: 800,
  API_RESPONSE_TIME: 1000,
  RENDER_TIME: 100,
  MEMORY_USAGE: 50,
}
```

### **React Query Budgets**

Edit `src/lib/react-query-performance.ts` to adjust React Query thresholds:

```typescript
export const REACT_QUERY_BUDGETS = {
  CACHE_HIT_RATE: 80,
  AVERAGE_QUERY_TIME: 500,
  AVERAGE_MUTATION_TIME: 1000,
  MAX_STALE_QUERIES: 10,
}
```

## 📱 **Mobile Performance**

The monitoring system includes mobile-specific optimizations:

- **Touch Performance**: FID tracking for mobile devices
- **Network Conditions**: Adaptive thresholds for slower connections
- **Battery Impact**: Memory usage monitoring
- **Viewport Stability**: CLS tracking for mobile layouts

## 🚨 **Alerts and Notifications**

### **Console Logging**
- Performance metrics are logged to the browser console
- Color-coded messages for different severity levels
- Detailed breakdown of performance data

### **Budget Violations**
- Automatic detection of performance budget violations
- Clear violation messages with specific metrics
- Recommendations for performance improvements

## 🔄 **Integration with Existing Systems**

### **Stock Adjustments Page**
The stock adjustments page now includes performance monitoring:

```typescript
// Automatically tracks performance
const { data, isLoading } = useStockAdjustments(filters)

// Performance metrics are logged automatically
useEffect(() => {
  if (data && !isLoading) {
    logPerformanceSummary()
  }
}, [data, isLoading])
```

### **React Query Integration**
All React Query operations are automatically tracked:

- Query execution time
- Cache hit/miss rates
- Background refetch frequency
- Mutation performance

## 📚 **Best Practices**

### **1. Monitor Key User Journeys**
Focus monitoring on critical user paths:
- Page load performance
- Data fetching operations
- User interactions
- Form submissions

### **2. Set Realistic Budgets**
Adjust performance budgets based on:
- User expectations
- Network conditions
- Device capabilities
- Business requirements

### **3. Regular Performance Reviews**
- Weekly performance reports
- Budget violation analysis
- Performance trend monitoring
- Optimization recommendations

### **4. Performance Optimization**
- Use React Query caching effectively
- Implement proper loading states
- Optimize bundle sizes
- Minimize API calls

## 🛠 **Troubleshooting**

### **Common Issues**

1. **High Memory Usage**
   - Check for memory leaks
   - Review React Query cache configuration
   - Optimize component rendering

2. **Slow API Responses**
   - Review server-side performance
   - Check network conditions
   - Optimize database queries

3. **Poor Core Web Vitals**
   - Optimize images and assets
   - Implement code splitting
   - Reduce JavaScript bundle size

### **Debug Tools**

```typescript
// Get detailed performance metrics
const metrics = getMetrics()
console.log('Performance Metrics:', metrics)

// Check budget violations
const budgetResults = checkPerformanceBudgets(metrics)
console.log('Budget Results:', budgetResults)

// React Query performance
const rqMetrics = performanceMonitor.getMetrics()
console.log('React Query Metrics:', rqMetrics)
```

## 🎯 **Next Steps**

1. **Set up automated performance monitoring**
2. **Create performance regression tests**
3. **Implement performance budgets in CI/CD**
4. **Add performance monitoring to other pages**
5. **Create performance optimization guidelines**

## 📞 **Support**

For performance monitoring issues:
1. Check the performance dashboard at `/performance`
2. Review console logs for detailed metrics
3. Run performance tests: `npm run performance:test`
4. Check performance budgets and violations

---

**Performance monitoring is now fully integrated and ready to help you maintain optimal application performance!** 🚀
