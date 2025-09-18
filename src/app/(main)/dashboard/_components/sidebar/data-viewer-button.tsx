'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PlusCircleIcon } from 'lucide-react'

export function DataViewerButton() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleClick = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('viewTable', 'true')
    const url = `${pathname ?? ''}?${params.toString()}`
    // try router.push(), then router.replace(), then full navigation as a last resort
    // add logs to help debug why navigation might not take effect
    // eslint-disable-next-line no-console
    console.debug('DataViewerButton: navigating to', url)
    try {
      await router.push(url, { scroll: false })
      // eslint-disable-next-line no-console
      console.debug('DataViewerButton: router.push succeeded')
      return
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.warn('DataViewerButton: router.push failed, trying replace', err)
    }

    try {
      await router.replace(url, { scroll: false })
      // eslint-disable-next-line no-console
      console.debug('DataViewerButton: router.replace succeeded')
      return
    } catch (err: unknown) {
      // fallback to full navigation
      // eslint-disable-next-line no-console
      console.warn('DataViewerButton: router.replace failed, falling back to location.href', err)
      window.location.href = url
    }
  }

  return (
    <Button
      onClick={handleClick}
      type="button"
      className="bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/90 min-w-8 duration-200 ease-linear relative z-40 pointer-events-auto"
    >
      <PlusCircleIcon className="mr-2 size-4" />
      View Full Table
    </Button>
  )
}
