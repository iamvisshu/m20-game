import type { Attribute } from './attribute'

export interface Question {
  id: string
  text: string
  primaryAttributeId: Attribute['id']
  questionFamilyId?: string
  active: boolean
}
