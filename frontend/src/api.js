import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('petlume-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function saveSession(session) {
  localStorage.setItem('petlume-token', session.access_token)
  localStorage.setItem('petlume-user', JSON.stringify(session.user))
}

export function clearSession() {
  localStorage.removeItem('petlume-token')
  localStorage.removeItem('petlume-user')
}

export default api