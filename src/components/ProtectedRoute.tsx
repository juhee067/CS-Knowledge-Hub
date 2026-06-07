import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        불러오는 중…
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
