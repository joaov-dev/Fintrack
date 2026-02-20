import { Router } from 'express'
import { register, login, me, updateProfile, changePassword, clearAccountData } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'

export const authRoutes = Router()

authRoutes.post('/register', register)
authRoutes.post('/login', login)
authRoutes.get('/me', authenticate, me)
authRoutes.put('/profile', authenticate, updateProfile)
authRoutes.put('/change-password', authenticate, changePassword)
authRoutes.delete('/data', authenticate, clearAccountData)
