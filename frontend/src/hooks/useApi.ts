// ─────────────────────────────────────────────────────────────────────────────
//  Custom Hooks — AgentOS Frontend
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import * as api from '@/services/api'

// ─── Generic async data hook ─────────────────────────────────────────────────

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []): AsyncState<T> {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fn()
      .then((result) => { if (!cancelled) { setData(result); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(err.message ?? 'Unknown error'); setLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const refetch = React.useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, refetch }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useHealth          = () => useAsync(() => api.getHealth(), [])
export const useBandStatus      = () => useAsync(() => api.getBandStatus(), [])
export const useIntegration     = () => useAsync(() => api.getIntegrationStatus(), [])
export const useWorkflows       = () => useAsync(() => api.getWorkflows(), [])
export const useWorkflow        = (id: string) => useAsync(() => api.getWorkflow(id), [id])
export const useWorkflowAudit   = (id: string) => useAsync(() => api.getWorkflowAudit(id), [id])
export const useWorkflowRisk    = (id: string) => useAsync(() => api.getWorkflowRisk(id), [id])
export const useWorkflowCost    = (id: string) => useAsync(() => api.getWorkflowCost(id), [id])
export const useWorkflowPerf    = (id: string) => useAsync(() => api.getWorkflowPerformance(id), [id])
export const useWorkflowLineage = (id: string) => useAsync(() => api.getWorkflowLineage(id), [id])
export const useAgents          = () => useAsync(() => api.getAgents(), [])
export const useGovernanceAgents = () => useAsync(() => api.getGovernanceAgents(), [])
