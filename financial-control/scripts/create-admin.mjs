#!/usr/bin/env node
/**
 * create-admin.mjs
 *
 * Creates the first AdminAccount in the database.
 * Usage:
 *   node scripts/create-admin.mjs --username admin --password "MinhaSenh@Forte1"
 *
 * Requires DATABASE_URL to be set in environment (or loaded from backend/.env).
 */

import { createRequire } from 'module'
import { parseArgs } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(__dirname, '../backend')

// Use require rooted in backend so its node_modules are resolved
const require = createRequire(path.join(backendDir, 'package.json'))

// Load .env from backend directory
const dotenv = require('dotenv')
dotenv.config({ path: path.join(backendDir, '.env') })

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const { values } = parseArgs({
  options: {
    username: { type: 'string' },
    password: { type: 'string' },
    role:     { type: 'string', default: 'SUPER_ADMIN' },
  },
  strict: true,
})

const { username, password, role } = values

if (!username || !password) {
  console.error('Usage: node scripts/create-admin.mjs --username <name> --password <pass>')
  process.exit(1)
}

if (password.length < 8) {
  console.error('Error: password must be at least 8 characters')
  process.exit(1)
}

if (!['SUPER_ADMIN', 'ADMIN_READONLY'].includes(role)) {
  console.error('Error: role must be SUPER_ADMIN or ADMIN_READONLY')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.adminAccount.findUnique({ where: { username } })
  if (existing) {
    console.error(`Error: admin with username "${username}" already exists`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await prisma.adminAccount.create({
    data: { username, passwordHash, role },
  })

  console.log(`✓ Admin created: id=${admin.id} username=${admin.username} role=${admin.role}`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
