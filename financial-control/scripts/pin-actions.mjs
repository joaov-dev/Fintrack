#!/usr/bin/env node
/**
 * pin-actions.mjs — Resolve GitHub Action tag references to commit SHAs
 *
 * WHY: GitHub Action tags (e.g. `actions/checkout@v4`) are mutable — the
 * repo owner can move the tag to a different commit at any time, potentially
 * introducing malicious code into your CI pipeline.
 *
 * Pinning to a commit SHA (`actions/checkout@11bd719...`) ensures you run
 * exactly the code you audited, regardless of what happens to the tag.
 *
 * USAGE:
 *   # Requires GITHUB_TOKEN env var (or GH_TOKEN) with public_repo read access
 *   GITHUB_TOKEN=ghp_xxx node scripts/pin-actions.mjs
 *
 *   # Dry run — show what would change without writing files
 *   GITHUB_TOKEN=ghp_xxx node scripts/pin-actions.mjs --dry-run
 *
 *   # Process a single file
 *   GITHUB_TOKEN=ghp_xxx node scripts/pin-actions.mjs --file .github/workflows/ci.yml
 *
 * WHAT IT DOES:
 *   1. Finds all .github/workflows/*.yml files
 *   2. Parses `uses: owner/repo@tag` references
 *   3. Resolves each tag to a commit SHA via the GitHub API
 *   4. Replaces the tag with the SHA and appends a `# tag` comment
 *
 * LIMITATIONS:
 *   - Only processes `uses:` directives (not `docker://` or local `./` actions)
 *   - Requires network access to api.github.com
 *   - Rate-limited to 60 req/hr (unauthenticated) or 5000 req/hr (authenticated)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { parseArgs } from 'util'

// ── Config ────────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
const WORKFLOWS_DIR = '.github/workflows'

// Pattern: `uses: owner/repo@ref` where ref is a tag or branch (not a SHA)
// A SHA is 40 hex chars; skip those (already pinned)
const USES_PATTERN = /uses:\s+([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)@([^\s#]+)/g

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if `ref` looks like a full commit SHA (40 hex chars). */
function isSha (ref) {
  return /^[0-9a-f]{40}$/i.test(ref)
}

/** Fetches the commit SHA for a given repo ref via the GitHub API. */
async function resolveTagToSha (owner, repo, ref) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/ref/tags/${ref}`
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'pin-actions/1.0',
  }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`

  // First try as a tag ref
  let res = await fetch(url, { headers })

  if (res.status === 404) {
    // Might be a branch ref (e.g. main, master)
    const branchUrl = `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${ref}`
    res = await fetch(branchUrl, { headers })
  }

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${owner}/${repo}@${ref}: ${await res.text()}`)
  }

  const data = await res.json()

  // Annotated tags point to a tag object, not a commit — follow the peel
  if (data.object?.type === 'tag') {
    const tagUrl = `https://api.github.com/repos/${owner}/${repo}/git/tags/${data.object.sha}`
    const tagRes = await fetch(tagUrl, { headers })
    if (!tagRes.ok) throw new Error(`Failed to peel tag object for ${owner}/${repo}@${ref}`)
    const tagData = await tagRes.json()
    return tagData.object.sha   // the commit SHA the tag points to
  }

  return data.object.sha
}

// ── SHA resolution cache (avoid redundant API calls) ─────────────────────────

const cache = new Map()

async function cachedResolve (owner, repo, ref) {
  const key = `${owner}/${repo}@${ref}`
  if (cache.has(key)) return cache.get(key)

  const sha = await resolveTagToSha(owner, repo, ref)
  cache.set(key, sha)
  return sha
}

// ── File processor ────────────────────────────────────────────────────────────

async function processFile (filePath, dryRun) {
  const original = readFileSync(filePath, 'utf8')
  let updated = original
  let changeCount = 0

  // Collect all unique `uses` references in the file
  const matches = [...original.matchAll(USES_PATTERN)]

  for (const match of matches) {
    const [fullMatch, repoSlug, ref] = match
    const [owner, repo] = repoSlug.split('/')

    // Skip if already pinned to a SHA
    if (isSha(ref)) {
      process.stdout.write(`  ${repoSlug}@${ref.slice(0, 8)}…  ${'\x1b[90m'}(already pinned)\x1b[0m\n`)
      continue
    }

    process.stdout.write(`  Resolving ${repoSlug}@${ref} … `)

    try {
      const sha = await cachedResolve(owner, repo, ref)
      const replacement = `uses: ${repoSlug}@${sha} # ${ref}`
      updated = updated.replace(fullMatch, replacement)
      process.stdout.write(`\x1b[32m${sha.slice(0, 8)}…\x1b[0m\n`)
      changeCount++
    } catch (err) {
      process.stdout.write(`\x1b[33mskipped (${err.message})\x1b[0m\n`)
    }
  }

  if (changeCount > 0 && !dryRun) {
    writeFileSync(filePath, updated, 'utf8')
    console.log(`  → wrote ${changeCount} change(s) to ${filePath}`)
  } else if (changeCount > 0 && dryRun) {
    console.log(`  → [dry-run] would write ${changeCount} change(s) to ${filePath}`)
  }

  return changeCount
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main () {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      file:      { type: 'string'  },
    },
    strict: true,
    allowPositionals: false,
  })

  const dryRun = values['dry-run']

  if (!GITHUB_TOKEN) {
    console.warn('\x1b[33mWarning: GITHUB_TOKEN not set. Unauthenticated requests are rate-limited to 60/hr.\x1b[0m\n')
  }

  // Determine files to process
  let files = []
  if (values.file) {
    files = [resolve(values.file)]
  } else {
    // Find all workflow YAML files
    const dir = resolve(WORKFLOWS_DIR)
    files = readdirSync(dir)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
      .map(f => join(dir, f))
  }

  console.log(`\x1b[1mpin-actions — resolving ${files.length} workflow file(s)\x1b[0m${dryRun ? ' \x1b[33m[dry-run]\x1b[0m' : ''}\n`)

  let totalChanges = 0
  for (const file of files) {
    console.log(`\x1b[1m${file}\x1b[0m`)
    totalChanges += await processFile(file, dryRun)
    console.log()
  }

  if (totalChanges === 0) {
    console.log('\x1b[32m✔ All action references are already pinned to SHAs.\x1b[0m')
  } else if (dryRun) {
    console.log(`\x1b[33m[dry-run] ${totalChanges} reference(s) would be pinned.\x1b[0m`)
    console.log('Remove --dry-run to apply changes.')
  } else {
    console.log(`\x1b[32m✔ Pinned ${totalChanges} action reference(s) to commit SHAs.\x1b[0m`)
    console.log('\nNext steps:')
    console.log('  1. Review the diff (`git diff`)')
    console.log('  2. Commit: git commit -m "chore(ci): pin action SHAs"')
  }
}

main().catch(err => {
  console.error('\x1b[31mFatal error:\x1b[0m', err.message)
  process.exit(1)
})
