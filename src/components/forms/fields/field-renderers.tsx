import { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

// Base field renderer interface
export interface FieldRendererProps {
  value: any
  row: any
  options?: Array<{ value: string; label: string }>
  className?: string
}

// Text field renderer
export function TextFieldRenderer({ value, className }: FieldRendererProps) {
  return (
    <span className={className}>
      {value || '-'}
    </span>
  )
}

// Number field renderer
export function NumberFieldRenderer({ value, className }: FieldRendererProps) {
  if (value === null || value === undefined) return <span className={className}>-</span>
  
  const num = Number(value)
  if (isNaN(num)) return <span className={className}>-</span>
  
  return (
    <span className={`${className} font-mono`}>
      {num.toLocaleString()}
    </span>
  )
}

// Date field renderer
export function DateFieldRenderer({ value, className }: FieldRendererProps) {
  if (!value) return <span className={className}>-</span>
  
  try {
    const date = new Date(value)
    return (
      <span className={className}>
        {format(date, 'MMM dd, yyyy')}
      </span>
    )
  } catch {
    return <span className={className}>-</span>
  }
}

// DateTime field renderer
export function DateTimeFieldRenderer({ value, className }: FieldRendererProps) {
  if (!value) return <span className={className}>-</span>
  
  try {
    const date = new Date(value)
    return (
      <span className={className}>
        {format(date, 'MMM dd, yyyy HH:mm')}
      </span>
    )
  } catch {
    return <span className={className}>-</span>
  }
}

// Boolean field renderer
export function BooleanFieldRenderer({ value, className }: FieldRendererProps) {
  return (
    <Badge 
      variant={value ? "default" : "secondary"}
      className={className}
    >
      {value ? 'Yes' : 'No'}
    </Badge>
  )
}

// Status field renderer
export function StatusFieldRenderer({ value, className }: FieldRendererProps) {
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'enabled':
      case 'published':
      case 'completed':
        return 'default'
      case 'inactive':
      case 'disabled':
      case 'draft':
      case 'pending':
        return 'secondary'
      case 'error':
      case 'failed':
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <Badge 
      variant={getStatusVariant(value)}
      className={className}
    >
      {value || 'Unknown'}
    </Badge>
  )
}

// Select field renderer
export function SelectFieldRenderer({ value, options, className }: FieldRendererProps) {
  const option = options?.find(opt => opt.value === value)
  return (
    <span className={className}>
      {option?.label || value || '-'}
    </span>
  )
}

// Email field renderer
export function EmailFieldRenderer({ value, className }: FieldRendererProps) {
  if (!value) return <span className={className}>-</span>
  
  return (
    <a 
      href={`mailto:${value}`}
      className={`${className} text-blue-600 hover:text-blue-800 underline`}
    >
      {value}
    </a>
  )
}

// URL field renderer
export function UrlFieldRenderer({ value, className }: FieldRendererProps) {
  if (!value) return <span className={className}>-</span>
  
  return (
    <a 
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} text-blue-600 hover:text-blue-800 underline`}
    >
      {value}
    </a>
  )
}

// Currency field renderer
export function CurrencyFieldRenderer({ value, className }: FieldRendererProps) {
  if (value === null || value === undefined) return <span className={className}>-</span>
  
  const num = Number(value)
  if (isNaN(num)) return <span className={className}>-</span>
  
  return (
    <span className={`${className} font-mono`}>
      ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

// Generic field renderer that chooses the right renderer based on type
export function GenericFieldRenderer({ 
  value, 
  row, 
  type = 'text', 
  options, 
  className 
}: FieldRendererProps & { type?: string }) {
  switch (type) {
    case 'number':
      return <NumberFieldRenderer value={value} row={row} className={className} />
    case 'date':
      return <DateFieldRenderer value={value} row={row} className={className} />
    case 'datetime':
      return <DateTimeFieldRenderer value={value} row={row} className={className} />
    case 'boolean':
      return <BooleanFieldRenderer value={value} row={row} className={className} />
    case 'status':
      return <StatusFieldRenderer value={value} row={row} className={className} />
    case 'select':
      return <SelectFieldRenderer value={value} row={row} options={options} className={className} />
    case 'email':
      return <EmailFieldRenderer value={value} row={row} className={className} />
    case 'url':
      return <UrlFieldRenderer value={value} row={row} className={className} />
    case 'currency':
      return <CurrencyFieldRenderer value={value} row={row} className={className} />
    default:
      return <TextFieldRenderer value={value} row={row} className={className} />
  }
}
