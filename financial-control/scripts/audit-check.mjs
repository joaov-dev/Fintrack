#!/usr/bin/env node
/**
 * audit-check.mjs — npm audit report parser and threshold enforcer
 *
 * Reads a JSON report produced by `npm audit --json`, prints a human-readable
 * summary, and exits with a non-zero code if vulnerabilities at or above the
 * specified severity level are found.
 *
 * Usage:
 *   node scripts/audit-check.mjs \
 *     --report /tmp/audit.json \
 *     --label  backend \
 *     --level  high
 *
 * Options:
 *   --report   Path to the JSON file produced by `npm audit --json`
 *   --label    Display label for the workspace being checked (e.g. backend)
 *   --level    Minimum severity to fail on: low | moderate | high | critical
 *   --allow    Comma-separated list of CVE IDs to ignore (reviewed exceptions)
 *              e.g. --allow GHSA-xxxx-yyyy-zzzz,GHSA-aaaa-bbbb-cccc
 *
 * Exit codes:
 *   0 — No violations at or above --level
 *   1 — Violations found (build should fail)
 *   2 — Usage error or unreadable report
 */

import { readFileSync } from 'fs'
import { parseArgs } from 'util'

// ── ANSI colours ──────────────────────────────────────────────────────────────

const C = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  red:      '\x1b[31m',
  yellow:   '\x1b[33m',
  cyan:     '\x1b[36m',
  green:    '\x1b[32m',
  gray:     '\x1b[90m',
  white:    '\x1b[97m',
  bgRed:    '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgGreen:  '\x1b[42m',
}

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info']
const SEVERITY_COLOUR = {
  critical: `${C.bgRed}${C.white}${C.bold}`,
  high:     `${C.red}${C.bold}`,
  moderate: `${C.yellow}`,
  low:      `${C.cyan}`,
  info:     `${C.gray}`,
}

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseCliArgs () {
  const { values } = parseArgs({
    options: {
      report: { type: 'string' },
      label:  { type: 'string', default: 'workspace' },
      level:  { type: 'string', default: 'high' },
      allow:  { type: 'string', default: '' },
    },
    strict: true,
    allowPositionals: false,
  })

  if (!values.report) {
    console.error('Usage: audit-check.mjs --report <path> [--label <name>] [--level high] [--allow GHSA-xxx,...]')
    process.exit(2)
  }

  if (!SEVERITY_ORDER.includes(values.level)) {
    console.error(`Invalid --level "${values.level}". Must be one of: ${SEVERITY_ORDER.join(', ')}`)
    process.exit(2)
  }

  const allowList = values.allow
    ? values.allow.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return { reportPath: values.report, label: values.label, level: values.level, allowList }
}

// ── Report loading ────────────────────────────────────────────────────────────

function loadReport (path) {
  try {
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    console.error(`Failed to read audit report at "${path}": ${err.message}`)
    process.exit(2)
  }
}

// ── Severity threshold ────────────────────────────────────────────────────────

/** Returns true if `vuln` severity is at or above the threshold. */
function meetsThreshold (vulnSeverity, threshold) {
  const vulnIdx      = SEVERITY_ORDER.indexOf(vulnSeverity)
  const thresholdIdx = SEVERITY_ORDER.indexOf(threshold)
  // Lower index = higher severity (critical=0, info=4)
  return vulnIdx !== -1 && thresholdIdx !== -1 && vulnIdx <= thresholdIdx
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main () {
  const { reportPath, label, level, allowList } = parseCliArgs()
  const report = loadReport(reportPath)

  // npm audit --json v2 format (npm 7+)
  const vulnerabilities = report.vulnerabilities ?? {}
  const meta            = report.metadata?.vulnerabilities ?? {}

  // ── Summary header ──────────────────────────────────────────────────────────

  const totalVulns = meta.total ?? Object.keys(vulnerabilities).length
  const separator  = '─'.repeat(60)

  console.log(`\n${C.bold}${separator}${C.reset}`)
  console.log(`${C.bold}  npm audit — ${label}${C.reset}`)
  console.log(`${C.bold}${separator}${C.reset}`)

  // ── Per-severity counts ─────────────────────────────────────────────────────

  for (const sev of SEVERITY_ORDER) {
    const count = meta[sev] ?? 0
    if (count === 0) continue
    const colour = SEVERITY_COLOUR[sev] ?? ''
    console.log(`  ${colour}${sev.padEnd(10)}${C.reset}  ${count}`)
  }

  if (totalVulns === 0) {
    console.log(`  ${C.green}No vulnerabilities found.${C.reset}`)
    console.log(`${C.bold}${separator}${C.reset}\n`)
    process.exit(0)
  }

  console.log(`  ${'─'.repeat(20)}`)
  console.log(`  ${'total'.padEnd(10)}  ${totalVulns}`)
  console.log(`${C.bold}${separator}${C.reset}\n`)

  // ── Detail table for threshold violations ───────────────────────────────────

  const violations = []
  const suppressed = []

  for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
    if (!meetsThreshold(vuln.severity, level)) continue

    // Collect advisory IDs from the "via" chain
    const advisoryIds = (vuln.via ?? [])
      .filter(v => typeof v === 'object' && v.url)
      .map(v => {
        // Extract GHSA or CVE from URL e.g. https://github.com/advisories/GHSA-xxx
        const match = v.url?.match(/(GHSA-[\w-]+|CVE-\d{4}-\d+)/)
        return match ? match[1] : v.url
      })

    const isAllowed = advisoryIds.some(id => allowList.includes(id))

    const entry = {
      package:     pkgName,
      severity:    vuln.severity,
      advisories:  advisoryIds.join(', ') || '(transitive)',
      range:       vuln.range ?? 'unknown',
      fixAvailable: !!vuln.fixAvailable,
    }

    if (isAllowed) {
      suppressed.push(entry)
    } else {
      violations.push(entry)
    }
  }

  // ── Print violations ────────────────────────────────────────────────────────

  if (violations.length > 0) {
    console.log(`${C.red}${C.bold}VIOLATIONS (${violations.length} package(s) at or above "${level}"):${C.reset}\n`)

    for (const v of violations) {
      const sev    = SEVERITY_COLOUR[v.severity] ?? ''
      const fix    = v.fixAvailable ? `${C.green}fix available${C.reset}` : `${C.yellow}no fix${C.reset}`
      console.log(`  ${sev}[${v.severity.toUpperCase()}]${C.reset} ${C.bold}${v.package}${C.reset}`)
      console.log(`    Advisory : ${v.advisories}`)
      console.log(`    Range    : ${v.range}`)
      console.log(`    Fix      : ${fix}`)
      console.log()
    }
  }

  // ── Print suppressed (allowed exceptions) ───────────────────────────────────

  if (suppressed.length > 0) {
    console.log(`${C.yellow}SUPPRESSED via --allow (${suppressed.length} package(s)):${C.reset}`)
    for (const v of suppressed) {
      console.log(`  ${C.gray}[${v.severity}] ${v.package} — ${v.advisories}${C.reset}`)
    }
    console.log()
  }

  // ── Exit ────────────────────────────────────────────────────────────────────

  if (violations.length > 0) {
    console.log(`${C.red}${C.bold}✖  Build blocked: ${violations.length} unresolved vulnerability(ies) at "${level}" or above.${C.reset}`)
    console.log(`${C.gray}   Run \`npm audit fix\` in the affected workspace, or add the advisory ID`)
    console.log(`   to --allow with a documented justification in the CI config.${C.reset}\n`)
    process.exit(1)
  }

  console.log(`${C.green}${C.bold}✔  No violations at "${level}" or above.${C.reset}\n`)
  process.exit(0)
}

main()
