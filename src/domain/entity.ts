export interface Entity {
  id: string
  canonicalName: string
  aliases: string[]
  description?: string
  active: boolean
}

export interface Category {
  id: string
  name: string
  description?: string
  active: boolean
}
