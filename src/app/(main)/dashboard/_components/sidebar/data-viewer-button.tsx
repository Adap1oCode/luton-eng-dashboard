'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircleIcon } from 'lucide-react'

export function DataViewerButton() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('viewTable', 'true')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Button
      onClick={handleClick}
      className="bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/90 min-w-8 duration-200 ease-linear"
    >
      <PlusCircleIcon className="mr-2 size-4" />
      View Full Table
    </Button>
  )
}
