import { NavLink, useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { USER_KEY } from '../services/api'

export function Sidebar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem(USER_KEY) ?? '{}') as { name?: string; email?: string; role?: string }
  const isStudent = String(user.role ?? '').trim().toLowerCase() === 'student'

  function logout() {
    localStorage.removeItem('course_booking_token')
    localStorage.removeItem(USER_KEY)
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="brand-mark">C</div>
      <div className="brand-copy">
        <strong>Classroom</strong>
        <span>Family learning</span>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>Overview</NavLink>
        {!isStudent ? <NavLink to="/booking" className={({ isActive }) => (isActive ? 'active' : '')}>Book a class</NavLink> : null}
      </nav>
      <div className="sidebar-footer">
        <div className="user-summary">
          <span className="avatar">{(user.name ?? user.email ?? (isStudent ? 'S' : 'P')).charAt(0).toUpperCase()}</span>
          <span><strong>{user.name ?? (isStudent ? 'Student account' : 'Parent account')}</strong><small>{user.email ?? 'Signed in'}</small></span>
        </div>
        <Button variant="quiet" onClick={logout}>Sign out</Button>
      </div>
    </aside>
  )
}
