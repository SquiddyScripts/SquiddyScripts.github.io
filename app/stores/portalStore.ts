import { create } from 'zustand';

interface PortalStore {
  activePortalId: string | null;
  requestedPortalId: string | null;
  hoveredPortalId: string | null;
  setActivePortal: (activePortalId: string | null) => void;
  requestPortal: (requestedPortalId: string | null) => void;
  setHoveredPortal: (hoveredPortalId: string | null) => void;
}

export const usePortalStore = create<PortalStore>((set) => ({
  activePortalId: null,
  requestedPortalId: null,
  hoveredPortalId: null,
  setActivePortal: (activePortalId) => set(() => ({ activePortalId })),
  requestPortal: (requestedPortalId) => set(() => ({ requestedPortalId })),
  setHoveredPortal: (hoveredPortalId) => set(() => ({ hoveredPortalId })),
}))
