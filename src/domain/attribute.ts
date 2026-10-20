export const ATTRIBUTE_VALUE_TYPES = [
  'BOOLEAN',
  'NUMERIC',
  'CATEGORICAL',
  'MULTI_VALUE',
] as const

export type AttributeValueType = (typeof ATTRIBUTE_VALUE_TYPES)[number]

export interface Attribute {
  id: string
  name: string
  valueType: AttributeValueType
  description?: string
  active: boolean
}
