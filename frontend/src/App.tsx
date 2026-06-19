import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { Dashboard }     from '@/pages/Dashboard'
import { Investigation } from '@/pages/Investigation'
import { Explainability } from '@/pages/Explainability'
import { Audit }         from '@/pages/Audit'
import { Risk }          from '@/pages/Risk'
import { Performance }   from '@/pages/Performance'
import { Cost }          from '@/pages/Cost'
import { Agents }        from '@/pages/Agents'
import { Collaboration } from '@/pages/Collaboration'
import { BandCenter }    from '@/pages/BandCenter'
import { DemoWorkflow }  from '@/pages/DemoWorkflow'

function Wrap({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard"     element={<Wrap><Dashboard /></Wrap>} />
        <Route path="/investigation" element={<Wrap><Investigation /></Wrap>} />
        <Route path="/explainability" element={<Wrap><Explainability /></Wrap>} />
        <Route path="/audit"         element={<Wrap><Audit /></Wrap>} />
        <Route path="/risk"          element={<Wrap><Risk /></Wrap>} />
        <Route path="/performance"   element={<Wrap><Performance /></Wrap>} />
        <Route path="/cost"          element={<Wrap><Cost /></Wrap>} />
        <Route path="/agents"        element={<Wrap><Agents /></Wrap>} />
        <Route path="/collaboration" element={<Wrap><Collaboration /></Wrap>} />
        <Route path="/band"          element={<Wrap><BandCenter /></Wrap>} />
        <Route path="/demo"          element={<Wrap><DemoWorkflow /></Wrap>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
