import { create } from 'zustand'

interface DashboardState {
  selectedOwner: string | null
  setSelectedOwner: (owner: string | null) => void
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  selectedOwner: null,
  setSelectedOwner: (owner) => set({ selectedOwner: owner }),
}))
