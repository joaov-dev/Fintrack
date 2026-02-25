import { Router } from 'express'
import {
  register,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  updatePreferences,
  changePassword,
  clearAccountData,
  listSessions,
  revokeSession,
  verifyMfa,
  setupMfa,
  enableMfa,
  disableMfa,
} from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'

export const authRoutes = Router()

authRoutes.post('/register',         register)
authRoutes.post('/login',            login)
authRoutes.post('/refresh',          refresh)
authRoutes.post('/logout',           logout)
authRoutes.get('/me',                authenticate, me)
authRoutes.put('/profile',           authenticate, updateProfile)
authRoutes.put('/preferences',       authenticate, updatePreferences)
authRoutes.put('/change-password',   authenticate, changePassword)
authRoutes.delete('/data',           authenticate, clearAccountData)

// Session management
authRoutes.get('/sessions',          authenticate, listSessions)
authRoutes.delete('/sessions/:id',   authenticate, revokeSession)

// MFA
authRoutes.post('/mfa/verify',       verifyMfa)
authRoutes.post('/mfa/setup',        authenticate, setupMfa)
authRoutes.post('/mfa/enable',       authenticate, enableMfa)
authRoutes.delete('/mfa/disable',    authenticate, disableMfa)
