import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jwtDecode, type JwtPayload } from 'jwt-decode'
import { api, TOKEN_KEY, USER_KEY, getApiErrorMessage, type ApiEnvelope, type AuthUser } from '../../services/api'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'

interface LoginResponse extends ApiEnvelope<unknown> { token?: string; accessToken?: string }
interface SessionClaims extends JwtPayload { id?: string; userId?: string; role?: string; name?: string; email?: string }

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password })
      const body = response.data
      const token = body.token ?? body.accessToken
      if (!token) throw new Error('The login response did not include a token.')
      const claims = jwtDecode<SessionClaims>(token)
      const user: AuthUser = body.user ?? { id: claims.id ?? claims.userId ?? claims.sub ?? '', role: claims.role ?? 'Parent', name: claims.name, email: claims.email ?? email }
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      const isStudent = String(user.role).trim().toLowerCase() === 'student'
      navigate(isStudent || String(user.role).trim().toLowerCase() === 'parent' ? '/dashboard' : '/booking', { replace: true })
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, 'We could not sign you in. Check your details and try again.'))
    } finally { setLoading(false) }
  }

  return <main className="auth-page"><div className="auth-art"><span className="eyebrow">Classroom / Family learning</span><h1>Make room for curiosity.</h1><p>One calm place to find the right class, at the right time, for every learner in your family.</p><div className="art-note">Good things grow with a little room.</div></div><form className="auth-form" onSubmit={submit}><div className="section-heading"><span className="eyebrow">Welcome back</span><h2>Sign in to Classroom</h2><p>Your family schedule is waiting.</p></div><Input label="Email address" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><Input label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />{error ? <p className="form-message error">{error}</p> : null}<Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button><small className="secure-note">Your session is protected by your account token.</small></form></main>
}
