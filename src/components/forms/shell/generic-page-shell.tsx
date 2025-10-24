import { ReactNode } from 'react'
import PageShell from './page-shell'
import { ToolbarConfig, ActionConfig } from './toolbar/types'

interface GenericPageShellProps {
  // Required: Page title
  title: string
  // Required: Total count of items
  count: number
  // Required: Children (usually the table)
  children: ReactNode
  // Optional: Custom toolbar configuration
  toolbarConfig?: ToolbarConfig
  // Optional: Custom actions
  toolbarActions?: ActionConfig
  // Optional: Chips configuration for filters
  chipConfig?: any
  // Optional: Enable advanced filters
  enableAdvancedFilters?: boolean
  // Optional: Show save view button
  showSaveViewButton?: boolean
  // Optional: Show toolbar container
  showToolbarContainer?: boolean
  // Optional: Custom CSS classes
  className?: string
}

export default function GenericPageShell({
  title,
  count,
  children,
  toolbarConfig,
  toolbarActions,
  chipConfig,
  enableAdvancedFilters = true,
  showSaveViewButton = false,
  showToolbarContainer = false,
  className,
}: GenericPageShellProps) {
  return (
    <PageShell
      title={title}
      count={count}
      toolbarConfig={toolbarConfig}
      toolbarActions={toolbarActions}
      chipConfig={chipConfig}
      enableAdvancedFilters={enableAdvancedFilters}
      showSaveViewButton={showSaveViewButton}
      showToolbarContainer={showToolbarContainer}
      className={className}
    >
      {children}
    </PageShell>
  )
}

// Pre-configured shells for common use cases
export function ListPageShell({ title, count, children, ...props }: Omit<GenericPageShellProps, 'enableAdvancedFilters' | 'showSaveViewButton' | 'showToolbarContainer'>) {
  return (
    <GenericPageShell
      title={title}
      count={count}
      enableAdvancedFilters={true}
      showSaveViewButton={false}
      showToolbarContainer={false}
      {...props}
    >
      {children}
    </GenericPageShell>
  )
}

export function DetailPageShell({ title, count, children, ...props }: Omit<GenericPageShellProps, 'enableAdvancedFilters' | 'showSaveViewButton' | 'showToolbarContainer'>) {
  return (
    <GenericPageShell
      title={title}
      count={count}
      enableAdvancedFilters={false}
      showSaveViewButton={true}
      showToolbarContainer={true}
      {...props}
    >
      {children}
    </GenericPageShell>
  )
}
