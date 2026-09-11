import { lazy, Suspense } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import HomeworkPage from './pages/HomeworkPage'
import SettingsPage from './pages/SettingsPage'
import WrongBookPage from './pages/WrongBookPage'
import WrongDetailPage from './pages/WrongDetailPage'

const RecordsPage = lazy(() => import('./pages/RecordsPage'))

function RecordsFallback() {
  return (
    <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#66756c] border border-[#ece6d8]">
      正在加载学习记录…
    </div>
  )
}

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
        {
          path: 'records',
          element: (
            <Suspense fallback={<RecordsFallback />}>
              <RecordsPage />
            </Suspense>
          ),
        },
        { path: 'settings', element: <SettingsPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: basename || undefined },
)
