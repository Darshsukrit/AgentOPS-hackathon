import React, { createContext, useContext, useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  const toggle = () => setCollapsed((prev) => !prev)

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {/* Ambient background with light mesh glows */}
      <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center p-4 bg-[#07080A]">
        {/* Floating backdrop lights */}
        <div className="orb-glow orb-1" aria-hidden="true" />
        <div className="orb-glow orb-2" aria-hidden="true" />
        <div className="orb-glow orb-3" aria-hidden="true" />

        {/* Floating premium OS container */}
        <div className="relative w-full h-full glass rounded-[32px] overflow-hidden flex shadow-2xl shadow-black/80 z-10">
          {/* Sidebar navigation */}
          <Sidebar />

          {/* Main Content Workspace */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-transparent">
            {/* Top Bar navigation & tools */}
            <TopNavbar />
            
            {/* Scrollable primary content */}
            <main
              id="main-content"
              className="flex-1 overflow-y-auto p-2"
              style={{ scrollbarGutter: 'stable' }}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
