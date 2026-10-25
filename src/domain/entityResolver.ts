export interface EntityResolverRecord {
  id: string
  canonicalName: string
  aliases: string[]
  active: boolean
}

export function normalizeEntityName(value: string): string {
  return value.trim().toLowerCase()
}

export function resolveEntityId(
  input: string,
  entities: EntityResolverRecord[],
): string | undefined {
  const normalizedInput = normalizeEntityName(input)

  if (!normalizedInput) {
    return undefined
  }

  const activeEntities = entities.filter((entity) => entity.active)

  const canonicalMatch = activeEntities.find(
    (entity) => normalizeEntityName(entity.canonicalName) === normalizedInput,
  )

  if (canonicalMatch) {
    return canonicalMatch.id
  }

  const aliasMatch = activeEntities.find((entity) =>
    entity.aliases.some(
      (alias) => normalizeEntityName(alias) === normalizedInput,
    ),
  )

  return aliasMatch?.id
}
