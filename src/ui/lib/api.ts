const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

export interface Site {
  id: number
  name: string
  url: string
  check_interval: number
  timeout_ms: number
  expected_status: number
  accept_2xx: boolean
  skip_cache_buster: boolean
  no_follow_redirects: boolean
  keyword: string | null
  alert_after_failures: number
  is_active: boolean
  created_at: string
  current_status?: 'up' | 'down' | 'degraded' | 'unknown'
  last_response_ms?: number
  last_checked_at?: string
  last_error_message?: string | null
}

export interface Check {
  id: number
  site_id: number
  status_code: number
  response_ms: number
  success: boolean
  checked_at: string
  error_message?: string | null
}

export interface Incident {
  id: number
  site_id: number
  site_name?: string
  started_at: string
  resolved_at: string | null
  failure_count: number
  last_status_code: number
}

export interface BackupHeartbeat {
  id: number
  site_name: string
  last_backup_at: string
  status: 'success' | 'failed'
}

export interface Stats {
  total_sites: number
  sites_up: number
  sites_down: number
  active_incidents: number
  uptime_percentage: number
}

export interface ChartDataPoint {
  time: string
  avgResponse: number
  minResponse: number
  maxResponse: number
  totalChecks: number
  successfulChecks: number
  uptime: string
}

export interface ChartData {
  period: '24h' | '30d'
  data: ChartDataPoint[]
}

export interface TimelinePoint {
  time: string
  success: boolean
  statusCode: number
  responseMs: number
}

export interface SiteComparison {
  id: number
  name: string
  url: string
  avgResponse: number
  totalChecks: number
  successfulChecks: number
  uptime: string
  currentStatus: 'up' | 'down' | 'degraded' | 'unknown'
}

export interface TestResult {
  success: boolean
  statusCode: number
  responseMs: number
  error: string | null
  checkedAt: string
}

export const api = {
  // Sites
  getSites: () => request<Site[]>('/sites'),
  getSite: (id: number) => request<Site>(`/sites/${id}`),
  createSite: (data: Partial<Site>) => request<Site>('/sites', { method: 'POST', body: JSON.stringify(data) }),
  updateSite: (id: number, data: Partial<Site>) => request<Site>(`/sites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSite: (id: number) => request<void>(`/sites/${id}`, { method: 'DELETE' }),
  testSite: (id: number) => request<TestResult>(`/sites/${id}/test`, { method: 'POST' }),
  bulkUpdateSites: (ids: number[], updates: Partial<Site>) =>
    request<{ updated: number }>('/sites/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ ids, updates }),
    }),

  // Checks
  getChecks: (siteId: number, limit?: number) => request<Check[]>(`/sites/${siteId}/checks${limit ? `?limit=${limit}` : ''}`),
  getChartData: (siteId: number, period?: '24h' | '30d') => request<ChartData>(`/sites/${siteId}/stats/chart${period ? `?period=${period}` : ''}`),
  getTimeline: (siteId: number) => request<TimelinePoint[]>(`/sites/${siteId}/stats/timeline`),

  // Incidents
  getIncidents: (params?: { active?: boolean; site_id?: number }) => {
    const query = new URLSearchParams()
    if (params?.active !== undefined) query.set('active', String(params.active))
    if (params?.site_id) query.set('site_id', String(params.site_id))
    return request<Incident[]>(`/incidents${query.toString() ? `?${query}` : ''}`)
  },

  // Backups
  getBackupHeartbeats: () => request<BackupHeartbeat[]>('/backups'),

  // Stats
  getStats: () => request<Stats>('/stats'),
  getAggregateChart: (period?: '24h' | '30d') => request<ChartData>(`/stats/chart${period ? `?period=${period}` : ''}`),
  getSitesComparison: () => request<SiteComparison[]>('/stats/sites-comparison'),

  // Health
  getHealth: () => request<{ status: string }>('/health'),
}
