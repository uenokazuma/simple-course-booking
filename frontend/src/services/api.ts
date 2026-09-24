import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
export const TOKEN_KEY = 'course_booking_token'
export const USER_KEY = 'course_booking_user'

export interface AuthUser {
  id: string
  role: string
  name?: string
  email?: string
}

export interface Student {
  id: string
  student_name: string
  grade?: string
  email?: string
}

export interface Booking {
  id: string
  student?: {
    id?: string | number
    student_name?: string
  }
  subject?: string
  className?: string
  trial_class?: {
    id?: string
    name?: string
    start_time?: string
    end_time?: string
    subject?: string | { name?: string }
  }
  trialClass?: {
    id?: string
    name?: string
    subject?: string
  }
  date?: string
  bookingDate?: string
  booking_date?: string
  startTime?: string
  start_time?: string
  endTime?: string
  end_time?: string
  time?: string
  status?: string
  studentId?: string
  payment_attempt?: PaymentAttempt
}

export interface PaymentAttempt {
  id: string | number
  booking_id: string | number
  amount?: string | number
  payment_method?: string | null
  status?: string
  transaction_reference?: string
  created_at?: string
  paid_at?: string | null
}

export interface TrialClass {
  id: string
  name: string
  start_time?: string
  end_time?: string
  subject?: string | { name?: string }
  description?: string
  duration?: number
}

export interface ApiEnvelope<T> {
  data?: T
  message?: string
  token?: string
  accessToken?: string
  user?: AuthUser
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
    return Promise.reject(error)
  },
)

export function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as ApiEnvelope<T>).data
    if (data !== undefined) return data
  }
  return payload as T
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (typeof error === 'string' && error.trim()) return error

  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: unknown } }).response?.data
    if (typeof response === 'string' && response.trim()) return response

    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>
      const message = payload.message ?? payload.error ?? payload.detail ?? payload.description
      if (typeof message === 'string' && message.trim()) return message
    }

    const directMessage = (error as { message?: string }).message
    if (typeof directMessage === 'string' && directMessage.trim()) return directMessage
  }

  return fallback
}
