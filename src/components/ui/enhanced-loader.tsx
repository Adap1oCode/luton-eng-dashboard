import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const enhancedLoaderVariants = cva(
  "fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50",
  {
    variants: {
      variant: {
        fullscreen: "fixed inset-0",
        overlay: "fixed inset-0",
        inline: "relative inset-0 bg-transparent backdrop-blur-none",
      },
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
    defaultVariants: {
      variant: "fullscreen",
      size: "md",
    },
  }
)

const spinnerVariants = cva(
  "relative",
  {
    variants: {
      size: {
        sm: "w-8 h-8",
        md: "w-12 h-12", 
        lg: "w-16 h-16",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const containerVariants = cva(
  "bg-white rounded-xl shadow-2xl border max-w-sm w-full mx-4",
  {
    variants: {
      size: {
        sm: "p-4 max-w-xs",
        md: "p-8 max-w-sm",
        lg: "p-10 max-w-md",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface EnhancedLoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedLoaderVariants> {
  title?: string
  description?: string
  showProgressDots?: boolean
  className?: string
}

const EnhancedLoader = React.forwardRef<HTMLDivElement, EnhancedLoaderProps>(
  ({ 
    className, 
    variant, 
    size, 
    title = "Loading...", 
    description = "Please wait...",
    showProgressDots = true,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(enhancedLoaderVariants({ variant, size }), className)}
        role="status"
        aria-live="polite"
        aria-label={`${title}: ${description}`}
        {...props}
      >
        <div className={cn(containerVariants({ size }))}>
          <div className="flex flex-col items-center space-y-4">
            {/* Enhanced spinner with dual rings */}
            <div className={cn(spinnerVariants({ size }))}>
              {/* Outer ring */}
              <div className={cn(
                "rounded-full border-4 border-blue-100",
                size === "sm" && "w-8 h-8 border-2",
                size === "md" && "w-12 h-12 border-4", 
                size === "lg" && "w-16 h-16 border-4"
              )}></div>
              
              {/* Primary spinning ring */}
              <div className={cn(
                "absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-500 animate-spin",
                size === "sm" && "w-8 h-8 border-2",
                size === "md" && "w-12 h-12 border-4",
                size === "lg" && "w-16 h-16 border-4"
              )}></div>
              
              {/* Secondary counter-spinning ring */}
              <div 
                className={cn(
                  "absolute rounded-full border-2 border-transparent border-t-orange-500 animate-spin",
                  size === "sm" && "inset-1 w-6 h-6 border-2",
                  size === "md" && "inset-2 w-8 h-8 border-2",
                  size === "lg" && "inset-3 w-10 h-10 border-2"
                )}
                style={{ 
                  animationDirection: 'reverse', 
                  animationDuration: '0.8s' 
                }}
              ></div>
            </div>
            
            {/* Loading text */}
            <div className="text-center">
              <h3 className={cn(
                "font-semibold text-gray-900 mb-1",
                size === "sm" && "text-base",
                size === "md" && "text-lg", 
                size === "lg" && "text-xl"
              )}>
                {title}
              </h3>
              <p className={cn(
                "text-gray-600 animate-pulse",
                size === "sm" && "text-xs",
                size === "md" && "text-sm",
                size === "lg" && "text-base"
              )}>
                {description}
              </p>
            </div>
            
            {/* Progress dots */}
            {showProgressDots && (
              <div className="flex space-x-1">
                <div 
                  className={cn(
                    "bg-blue-600 rounded-full animate-bounce",
                    size === "sm" && "w-1.5 h-1.5",
                    size === "md" && "w-2 h-2",
                    size === "lg" && "w-2.5 h-2.5"
                  )}
                ></div>
                <div 
                  className={cn(
                    "bg-blue-600 rounded-full animate-bounce",
                    size === "sm" && "w-1.5 h-1.5",
                    size === "md" && "w-2 h-2", 
                    size === "lg" && "w-2.5 h-2.5"
                  )}
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div 
                  className={cn(
                    "bg-blue-600 rounded-full animate-bounce",
                    size === "sm" && "w-1.5 h-1.5",
                    size === "md" && "w-2 h-2",
                    size === "lg" && "w-2.5 h-2.5"
                  )}
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)
EnhancedLoader.displayName = "EnhancedLoader"

// Convenience components for common use cases
export const FullScreenLoader = React.forwardRef<HTMLDivElement, Omit<EnhancedLoaderProps, 'variant'>>(
  (props, ref) => <EnhancedLoader ref={ref} variant="fullscreen" {...props} />
)
FullScreenLoader.displayName = "FullScreenLoader"

export const OverlayLoader = React.forwardRef<HTMLDivElement, Omit<EnhancedLoaderProps, 'variant'>>(
  (props, ref) => <EnhancedLoader ref={ref} variant="overlay" {...props} />
)
OverlayLoader.displayName = "OverlayLoader"

export const InlineLoader = React.forwardRef<HTMLDivElement, Omit<EnhancedLoaderProps, 'variant'>>(
  (props, ref) => <EnhancedLoader ref={ref} variant="inline" {...props} />
)
InlineLoader.displayName = "InlineLoader"

export { EnhancedLoader }
