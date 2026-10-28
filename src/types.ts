/**
 * Ranked fuzzy search contract.
 * @description Exposes one search over indexed strings.
 */
export type FuzzyIndex = {
  /** Rank matches for a query */
  search: (query: string, limit?: number) => FuzzyResult[]
}

/**
 * Ranked fuzzy match.
 * @description Pairs one matched string with its score.
 */
export type FuzzyResult = {
  /** Matched source string */
  value: string
  /** Overlap score */
  score: number
}
