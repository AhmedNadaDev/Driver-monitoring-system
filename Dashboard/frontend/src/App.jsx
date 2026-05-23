import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import RoleRoute from './routes/RoleRoute.jsx'
import { ROLES } from './contexts/AuthContext.jsx'
import AppLayout from './layout/AppLayout.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import OverviewPage from './features/overview/OverviewPage.jsx'
import DriversPage from './features/drivers/DriversPage.jsx'
import DriverDetailsPage from './features/drivers/DriverDetailsPage.jsx'
import EditDriverPage from './features/drivers/EditDriverPage.jsx'
import RoutesPage from './features/routes/RoutesPage.jsx'
import BusesPage from './features/buses/BusesPage.jsx'
import ChatbotPage from './features/chatbot/ChatbotPage.jsx'
import ProfilePage from './features/profile/ProfilePage.jsx'
import AdminsPage from './features/admins/AdminsPage.jsx'
import HistoryPage from './features/history/HistoryPage.jsx'
import NotFound from './pages/NotFound.jsx'
import ErrorBoundary from './shared/components/ErrorBoundary.jsx'

const App = () => (
  <AuthProvider>
    <Toaster richColors position="top-right" />
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/drivers/:id/edit" element={<EditDriverPage />} />
            <Route path="/drivers/:id" element={<DriverDetailsPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/buses" element={<BusesPage />} />
            <Route path="/chatbot" element={<ChatbotPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RoleRoute roles={[ROLES.SUPER_ADMIN]} />}>
              <Route path="/admins" element={<AdminsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </AuthProvider>
)

export default App
