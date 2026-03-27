export type WhitelistConfig = {
  domainWhitelist: string[]
  emailWhitelist: string[]
}

function normalizeList(value: string[] | undefined) {
  return (value ?? []).map(v => v.trim().toLowerCase()).filter(Boolean)
}

export function parseWhitelistFromEnvStrings(input: {
  emailDomainWhitelistPatternsString?: string | null
  emailWhitelistPatternsString?: string | null
}): WhitelistConfig {
  const domainWhitelist = normalizeList(
    input.emailDomainWhitelistPatternsString?.trim()
      ? input.emailDomainWhitelistPatternsString.split(",")
      : []
  )

  const emailWhitelist = normalizeList(
    input.emailWhitelistPatternsString?.trim()
      ? input.emailWhitelistPatternsString.split(",")
      : []
  )

  return { domainWhitelist, emailWhitelist }
}

export function isEmailAllowedByWhitelist(
  email: string | undefined | null,
  config: WhitelistConfig
) {
  const normalizedEmail = (email ?? "").trim().toLowerCase()

  if (!normalizedEmail) return false

  const hasRules =
    (config.domainWhitelist?.length ?? 0) > 0 ||
    (config.emailWhitelist?.length ?? 0) > 0

  // If no rules are provided, allow all (default behavior).
  if (!hasRules) return true

  const domain = normalizedEmail.split("@")[1] ?? ""
  const domainMatch = config.domainWhitelist.includes(domain)
  const emailMatch = config.emailWhitelist.includes(normalizedEmail)

  return domainMatch || emailMatch
}
