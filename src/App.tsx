import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import HomeworkPage from './pages/HomeworkPage'
import RecordsPage from './pages/RecordsPage'
import SettingsPage from './pages/SettingsPage'
import WrongBookPage from './pages/WrongBookPage'
import WrongDetailPage from './pages/WrongDetailPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/homework" element={<HomeworkPage />} />
        <Route path="/wrong-book" element={<WrongBookPage />} />
        <Route path="/wrong-book/:id" element={<WrongDetailPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
