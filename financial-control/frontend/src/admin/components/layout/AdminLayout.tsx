import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    meta.content = 'noindex,nofollow'
  }, [])

  return (
    <div className="admin-root flex min-h-screen bg-[#f5f6fa]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto p-7">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
