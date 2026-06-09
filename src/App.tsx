import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { FaqListPage } from '@/pages/FaqListPage'
import { FaqEditPage } from '@/pages/FaqEditPage'
import { FaqDetailPage } from '@/pages/FaqDetailPage'
import { SearchPage } from '@/pages/SearchPage'
import { ImportPage } from '@/pages/ImportPage'
import { InboxPage } from '@/pages/InboxPage'
import { QuickInputPage } from '@/pages/QuickInputPage'
import { ProcessInquiryPage } from '@/pages/ProcessInquiryPage'
import { AssetizeQueuePage } from '@/pages/AssetizeQueuePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AskHubPage } from '@/pages/AskHubPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/search" replace />} />
              <Route path="/ask" element={<AskHubPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/faqs" element={<FaqListPage />} />
              <Route path="/faqs/new" element={<FaqEditPage />} />
              <Route path="/faqs/:id" element={<FaqDetailPage />} />
              <Route path="/faqs/:id/edit" element={<FaqEditPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/process/:id" element={<ProcessInquiryPage />} />
              <Route path="/assetize" element={<AssetizeQueuePage />} />
              <Route path="/quick" element={<QuickInputPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
