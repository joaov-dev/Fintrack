/**
 * Privacy routes — LGPD/GDPR Data Subject Rights
 *
 * /api/v1/privacy/*
 *
 * All user routes require authentication.
 * Breach management routes (admin) require authentication + admin check
 * (enforced inside the handlers — extend with an adminGate middleware when
 * a proper admin role system is implemented).
 */

import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  getConsent,
  updateConsent,
  getConsentHistory,
  getPersonalData,
  exportPersonalData,
  requestErasure,
  cancelErasure,
  listBreachesHandler,
  createBreachHandler,
  getBreachHandler,
  updateBreachHandler,
  getBreachReportHandler,
  checkOverdueAnpdHandler,
} from '../controllers/privacy.controller'

export const privacyRoutes = Router()

// ── Data subject rights (authenticated users) ─────────────────────────────────

// LGPD Art. 18 II — Direito de acesso (structured JSON view)
privacyRoutes.get('/me',             authenticate, getPersonalData)

// LGPD Art. 18 V — Direito de portabilidade (downloadable JSON)
privacyRoutes.get('/export',         authenticate, exportPersonalData)

// Consent management
privacyRoutes.get('/consent',        authenticate, getConsent)
privacyRoutes.put('/consent',        authenticate, updateConsent)
privacyRoutes.get('/consent/history',authenticate, getConsentHistory)

// LGPD Art. 18 VI — Direito de eliminação / Right to erasure
privacyRoutes.delete('/account',     authenticate, requestErasure)
privacyRoutes.post('/account/cancel',authenticate, cancelErasure)

// ── Breach management (admin-only in production) ──────────────────────────────

privacyRoutes.get('/breaches',              authenticate, listBreachesHandler)
privacyRoutes.post('/breaches',             authenticate, createBreachHandler)
privacyRoutes.get('/breaches/overdue',      authenticate, checkOverdueAnpdHandler)
privacyRoutes.get('/breaches/:id',          authenticate, getBreachHandler)
privacyRoutes.patch('/breaches/:id',        authenticate, updateBreachHandler)
privacyRoutes.get('/breaches/:id/report',   authenticate, getBreachReportHandler)
