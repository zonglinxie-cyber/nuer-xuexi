import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './App'
import { initStorageAsync } from './services/storageService'
import './index.css'

function Root() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void initStorageAsync().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f1e8] text-[#4a5850]">
        正在读取本地学习数据…
      </div>
    )
  }

  return <RouterProvider router={router} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
