'use client'

import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'

type CellViewerProps = {
  label?: string
  value: string | number | null
}

export function CellViewer({ label, value }: CellViewerProps) {
  const isMobile = useIsMobile()

  const display = value !== null && value !== undefined ? String(value) : '—'

  return (
    <Drawer direction={isMobile ? 'bottom' : 'right'}>
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="px-0 text-left text-sm font-medium text-muted-foreground hover:text-primary"
        >
          {display}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-base font-medium">{label || 'Details'}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 text-sm">{display}</div>
        <DrawerFooter>
          <Button variant="outline">Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
