import { Navigate, createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import HomeworkPage from './pages/HomeworkPage'
import RecordsPage from './pages/RecordsPage'
import SettingsPage from './pages/SettingsPage'
import WrongBookPage from './pages/WrongBookPage'
import WrongDetailPage from './pages/WrongDetailPage'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'homework', element: <HomeworkPage /> },
        { path: 'wrong-book', element: <WrongBookPage /> },
        { path: 'wrong-book/:id', element: <WrongDetailPage /> },
        { path: 'records', element: <RecordsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: basename || undefined },
)
