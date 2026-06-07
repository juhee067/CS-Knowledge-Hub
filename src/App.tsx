import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { FaqListPage } from '@/pages/FaqListPage'
import { FaqEditPage } from '@/pages/FaqEditPage'
import { FaqDetailPage } from '@/pages/FaqDetailPage'
import { ClientsPage } from '@/pages/ClientsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/faqs" replace />} />
              <Route path="/faqs" element={<FaqListPage />} />
              <Route path="/faqs/new" element={<FaqEditPage />} />
              <Route path="/faqs/:id" element={<FaqDetailPage />} />
              <Route path="/faqs/:id/edit" element={<FaqEditPage />} />
              <Route path="/clients" element={<ClientsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/faqs" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
