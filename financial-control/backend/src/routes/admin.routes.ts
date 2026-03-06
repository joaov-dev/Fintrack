import { Router } from 'express'
import { adminAuth } from '../middlewares/adminAuth.middleware'
import { adminLoginLimiter, adminApiLimiter } from '../middlewares/rateLimiter'

import {
  adminLogin,
  adminLogout,
  adminMe,
  adminChangeCredentials,
} from '../controllers/admin/auth.controller'

import { adminStats } from '../controllers/admin/stats.controller'

import {
  listUsers,
  getUserDetail,
  suspendUser,
  reactivateUser,
  forceLogoutUser,
  exportUser,
} from '../controllers/admin/users.controller'

import {
  listAbandonedCheckouts,
  sendCouponToUser,
  sendCouponBulk,
} from '../controllers/admin/abandonedCheckouts.controller'

const router = Router()

// ── Public admin auth endpoint ────────────────────────────────────────────────
router.post('/auth/login', adminLoginLimiter, adminLogin)

// ── Authenticated admin endpoints ─────────────────────────────────────────────
router.use(adminApiLimiter)
router.use(adminAuth)

router.post('/auth/logout',             adminLogout)
router.get('/auth/me',                  adminMe)
router.post('/auth/change-credentials', adminChangeCredentials)

router.get('/stats', adminStats)

router.get('/users',              listUsers)
router.get('/users/:id',          getUserDetail)
router.post('/users/:id/suspend',      suspendUser)
router.post('/users/:id/reactivate',   reactivateUser)
router.post('/users/:id/force-logout', forceLogoutUser)
router.get('/users/:id/export',   exportUser)

// bulk must come before parameterized /:userId route
router.get('/abandoned-checkouts',                      listAbandonedCheckouts)
router.post('/abandoned-checkouts/send-coupon-bulk',    sendCouponBulk)
router.post('/abandoned-checkouts/:userId/send-coupon', sendCouponToUser)

export { router as adminRoutes }
