export const ANSWER_VALUES = [
  'YES',
  'PROBABLY_YES',
  'UNKNOWN',
  'PROBABLY_NO',
  'NO',
] as const

export type AnswerValue = (typeof ANSWER_VALUES)[number]

export const ANSWER_STRENGTH: Record<AnswerValue, number> = {
  YES: 1,
  PROBABLY_YES: 0.5,
  UNKNOWN: 0,
  PROBABLY_NO: -0.5,
  NO: -1,
}
