import { describe, expect, it } from 'vitest'

import {
  ANSWER_STRENGTH,
  ANSWER_VALUES,
  type AnswerValue,
  type Attribute,
  type Category,
  type Entity,
  type Question,
} from '../src/domain'

describe('M20 domain model', () => {
  it('defines the five gameplay answer states', () => {
    expect(ANSWER_VALUES).toEqual([
      'YES',
      'PROBABLY_YES',
      'UNKNOWN',
      'PROBABLY_NO',
      'NO',
    ])
  })

  it('assigns neutral strength to UNKNOWN', () => {
    expect(ANSWER_STRENGTH.UNKNOWN).toBe(0)
  })

  it('represents the core domain concepts', () => {
    const entity: Entity = {
      id: 'entity-water-bottle',
      canonicalName: 'Water Bottle',
      aliases: ['Drinking Bottle'],
      active: true,
    }

    const category: Category = {
      id: 'category-household',
      name: 'Household',
      active: true,
    }

    const attribute: Attribute = {
      id: 'attribute-portable',
      name: 'Portable',
      valueType: 'BOOLEAN',
      active: true,
    }

    const question: Question = {
      id: 'question-portable',
      text: 'Can you easily carry it?',
      primaryAttributeId: attribute.id,
      active: true,
    }

    const answer: AnswerValue = 'YES'

    expect(entity.canonicalName).toBe('Water Bottle')
    expect(category.name).toBe('Household')
    expect(attribute.valueType).toBe('BOOLEAN')
    expect(question.primaryAttributeId).toBe(attribute.id)
    expect(answer).toBe('YES')
  })
})
