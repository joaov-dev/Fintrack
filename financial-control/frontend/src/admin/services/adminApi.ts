import axios from 'axios'

const adminApi = axios.create({
  baseURL: '/admin',
  withCredentials: true,
})

// CSRF defense: every request gets X-Requested-With
adminApi.interceptors.request.use((config) => {
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

// On 401 → redirect to admin login (hard redirect to clear React state)
adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.endsWith('/login')) {
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  },
)

export default adminApi
