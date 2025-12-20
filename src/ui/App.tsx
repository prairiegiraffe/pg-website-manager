import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Sites from './pages/Sites'
import SiteDetail from './pages/SiteDetail'
import Incidents from './pages/Incidents'
import Backups from './pages/Backups'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="sites" element={<Sites />} />
        <Route path="sites/:id" element={<SiteDetail />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="backups" element={<Backups />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
