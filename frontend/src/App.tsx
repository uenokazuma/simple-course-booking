import './App.css'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './features/auth/Login'
import { Dashboard } from './features/dashboard/Dashboard'
import { BookingPage } from './features/booking/BookingPage'
import { BookingConfirmation } from './features/booking/BookingConfirmation'
import { PaymentPage } from './features/booking/PaymentPage'
import { TOKEN_KEY, USER_KEY } from './services/api'

function isRole(value: string | undefined, expected: 'Parent' | 'Student'): boolean {
  return value?.trim().toLowerCase() === expected.toLowerCase()
}

function ProtectedRoute() {
  return localStorage.getItem(TOKEN_KEY) ? <Layout /> : <Navigate to="/login" replace />
}

function ParentOnlyRoute() {
  const storedUser = localStorage.getItem(USER_KEY)
  const role = storedUser ? (JSON.parse(storedUser) as { role?: string }).role : undefined
  return isRole(role, 'Parent') || isRole(role, 'Student') ? <Dashboard /> : <Navigate to="/booking" replace />
}

function AppRoutes() {
  useLocation()
  const authenticated = Boolean(localStorage.getItem(TOKEN_KEY))
  const storedUser = localStorage.getItem(USER_KEY)
  const role = storedUser ? (JSON.parse(storedUser) as { role?: string }).role : undefined

  return (
    <Routes>
      <Route path="/login" element={authenticated ? <Navigate to={isRole(role, 'Parent') || isRole(role, 'Student') ? '/dashboard' : '/booking'} replace /> : <Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<ParentOnlyRoute />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/booking/confirmation" element={<BookingConfirmation />} />
        <Route path="/payment" element={<PaymentPage />} />
      </Route>
      <Route path="*" element={<Navigate to={authenticated ? (isRole(role, 'Parent') || isRole(role, 'Student') ? '/dashboard' : '/booking') : '/login'} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
