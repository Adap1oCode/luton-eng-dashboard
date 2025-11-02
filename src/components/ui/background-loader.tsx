import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const backgroundLoaderVariants = cva(
  "fixed z-50",
  {
    variants: {
      position: {
        "top-right": "top-4 right-4",
        "top-left": "top-4 left-4", 
        "bottom-right": "bottom-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "top-center": "top-4 left-1/2 transform -translate-x-1/2",
      },
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
    defaultVariants: {
      position: "top-right",
      size: "md",
    },
  }
)

const containerVariants = cva(
  "bg-white rounded-lg shadow-lg border",
  {
    variants: {
      size: {
        sm: "p-2",
        md: "p-3",
        lg: "p-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-blue-600",
  {
    variants: {
      size: {
        sm: "h-3 w-3",
        md: "h-4 w-4",
        lg: "h-5 w-5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const textVariants = cva(
  "text-gray-700",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm", 
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface BackgroundLoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof backgroundLoaderVariants> {
  message?: string
  className?: string
}

const BackgroundLoader = React.forwardRef<HTMLDivElement, BackgroundLoaderProps>(
  ({ 
    className, 
    position, 
    size, 
    message = "Updating...",
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(backgroundLoaderVariants({ position, size }), className)}
        role="status"
        aria-live="polite"
        aria-label={message}
        {...props}
      >
        <div className={cn(containerVariants({ size }))}>
          <div className="flex items-center space-x-2">
            <div className={cn(spinnerVariants({ size }))}></div>
            <span className={cn(textVariants({ size }))}>{message}</span>
          </div>
        </div>
      </div>
    )
  }
)
BackgroundLoader.displayName = "BackgroundLoader"

export { BackgroundLoader }
