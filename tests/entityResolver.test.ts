import { describe, expect, it } from 'vitest'
import {
  normalizeEntityName,
  resolveEntityId,
  type EntityResolverRecord,
} from '../src/domain/entityResolver'

const entities: EntityResolverRecord[] = [
  {
    id: 'television',
    canonicalName: 'Television',
    aliases: ['TV', 'Television Set'],
    active: true,
  },
  {
    id: 'refrigerator',
    canonicalName: 'Refrigerator',
    aliases: ['Fridge'],
    active: true,
  },
  {
    id: 'motorcycle',
    canonicalName: 'Motorcycle',
    aliases: ['Motorbike'],
    active: true,
  },
  {
    id: 'inactive',
    canonicalName: 'Inactive Entity',
    aliases: ['Old Alias'],
    active: false,
  },
]

describe('entity resolver', () => {
  it('normalizes leading and trailing whitespace', () => {
    expect(normalizeEntityName('  Television  ')).toBe('television')
  })

  it('normalizes case', () => {
    expect(normalizeEntityName('TV')).toBe('tv')
  })

  it('resolves a canonical name', () => {
    expect(resolveEntityId('Television', entities)).toBe('television')
  })

  it('resolves a canonical name case-insensitively', () => {
    expect(resolveEntityId('TELEVISION', entities)).toBe('television')
  })

  it('resolves an alias', () => {
    expect(resolveEntityId('TV', entities)).toBe('television')
  })

  it('resolves an alias case-insensitively', () => {
    expect(resolveEntityId('frIdGe', entities)).toBe('refrigerator')
  })

  it('resolves an alias with surrounding whitespace', () => {
    expect(resolveEntityId('  motorbike  ', entities)).toBe('motorcycle')
  })

  it('prefers a canonical-name match', () => {
    expect(resolveEntityId('Television', entities)).toBe('television')
  })

  it('returns undefined for an unknown name', () => {
    expect(resolveEntityId('Spaceship', entities)).toBeUndefined()
  })

  it('returns undefined for empty input', () => {
    expect(resolveEntityId('   ', entities)).toBeUndefined()
  })

  it('does not resolve inactive entities', () => {
    expect(resolveEntityId('Old Alias', entities)).toBeUndefined()
  })
})
