/**
 * UI Rules - Controls which global UI elements are shown on specific routes
 * 
 * This allows fine-grained control over global components like the date toolbar
 * and data viewer button without modifying individual page components.
 */

export const UI_RULES = {
  /**
   * Routes where the global date range toolbar should be hidden
   * Uses RegExp patterns to match against the current pathname
   */
  hideGlobalDateToolbarOn: [
    // Hide on all routes for now (can be made more specific later)
    /.*/
  ],

  /**
   * Routes where the "View Full Table" button should be hidden
   * Uses RegExp patterns to match against the current pathname
   */
  hideDataViewerButtonOn: [
    // Hide on all routes for now (can be made more specific later)
    /.*/
  ]
} as const;

/**
 * Check if a pathname matches any of the patterns in the given array
 */
export function shouldHideOnRoute(pathname: string, patterns: readonly RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(pathname));
}
