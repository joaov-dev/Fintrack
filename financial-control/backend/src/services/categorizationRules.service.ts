import { PrismaClient } from '@prisma/client'

type RuleSuggestion = {
  categoryId: string
  accountId: string | null
  ruleName: string
  ruleId: string
}

/**
 * Finds the first active categorization rule that matches the given description.
 * Rules are tested in descending priority order (higher priority = tested first).
 * Matching is case-insensitive.
 */
export async function suggestFromRules(
  description: string,
  userId: string,
  prisma: PrismaClient,
): Promise<RuleSuggestion | null> {
  const rules = await prisma.categorizationRule.findMany({
    where: { userId, isActive: true },
    orderBy: { priority: 'desc' },
    select: { id: true, name: true, pattern: true, matchType: true, categoryId: true, accountId: true },
  })

  const lower = description.toLowerCase()

  for (const rule of rules) {
    const pat = rule.pattern.toLowerCase()
    let matched = false

    switch (rule.matchType) {
      case 'STARTS_WITH': matched = lower.startsWith(pat); break
      case 'EQUALS':      matched = lower === pat; break
      case 'CONTAINS':
      default:            matched = lower.includes(pat)
    }

    if (matched) {
      // Increment usage counter (fire-and-forget, no await to avoid blocking)
      prisma.categorizationRule.update({
        where: { id: rule.id },
        data:  { appliedCount: { increment: 1 } },
      }).catch(() => {/* ignore */})

      return {
        categoryId: rule.categoryId,
        accountId:  rule.accountId,
        ruleName:   rule.name,
        ruleId:     rule.id,
      }
    }
  }

  return null
}
