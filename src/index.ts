import type * as Types from '@app/types.ts'
import Table from '@app/table.ts'
import Tokenizer from '@neabyte/byte-tokenizer'

/**
 * Bitwise fuzzy string index.
 * @description Projects hashed byte features and ranks overlaps.
 */
export default class FuzzyNet implements Types.FuzzyIndex {
  /** Shared byte tokenizer */
  static readonly tokenizer: Tokenizer = new Tokenizer()
  /** Bitwise feature table */
  readonly #table: Table
  /** Indexed source strings */
  readonly #values: readonly string[]

  /**
   * Index source strings.
   * @description Projects each document feature digest into bits.
   * @param values - Source strings to index
   */
  constructor(values: readonly string[]) {
    if (typeof values !== 'object' || values === null || typeof values.length !== 'number') {
      throw new TypeError('Values is not an array')
    }
    this.#values = values
    const total = values.length
    const table = new Table(total)
    this.#table = table
    for (let document = 0; document < total; document++) {
      const value = values[document]
      if (typeof value !== 'string') {
        throw new TypeError('Indexed value is not a string')
      }
      const chunk = document >>> 5
      const marker = 1 << (document & 31)
      const digests = this.#digests(value)
      for (let index = 0; index < digests.length; index++) {
        table.project(digests[index] as number, chunk, marker)
      }
    }
  }

  /**
   * Rank documents for query.
   * @description Scores feature overlap and returns the top matches.
   * @param query - Search query string
   * @param limit - Maximum number of results
   * @returns Ranked matching documents
   */
  search(query: string, limit = 10): Types.FuzzyResult[] {
    if (typeof query !== 'string') {
      throw new TypeError('Query is not a string')
    }
    if (typeof limit !== 'number') {
      throw new TypeError('Limit is not a number')
    }
    if (limit !== (limit | 0)) {
      throw new RangeError('Limit is not an integer')
    }
    if (limit <= 0) {
      return []
    }
    const digests = this.#digests(query)
    const features = digests.length
    if (features === 0) {
      return []
    }
    const table = this.#table
    const matrix = table.matrix
    const probes = new Array<readonly [number, number, number, number, number]>(features)
    for (let feature = 0; feature < features; feature++) {
      probes[feature] = table.probes(digests[feature] as number)
    }
    const documents = new Int32Array(limit)
    const scores = new Float64Array(limit)
    let filled = 0
    let minimum = 0
    for (let chunk = 0; chunk < table.chunks; chunk++) {
      let first = 0
      let second = 0
      let third = 0
      let fourth = 0
      for (let feature = 0; feature < features; feature++) {
        const probe = probes[feature]!
        const matched = (matrix[probe[0] + chunk] as number) &
          (matrix[probe[1] + chunk] as number) &
          (matrix[probe[2] + chunk] as number)
        fourth |= third & matched
        third |= second & matched
        second |= first & matched
        first |= matched
      }
      let candidates = minimum >>> 4 !== 0
        ? fourth
        : minimum >>> 3 !== 0
        ? third
        : minimum >>> 2 !== 0
        ? second
        : first
      while (candidates !== 0) {
        const lowest = candidates & -candidates
        candidates ^= lowest
        let score = 0
        for (let feature = 0; feature < features; feature++) {
          const probe = probes[feature]!
          if (
            ((matrix[probe[0] + chunk] as number) &
              (matrix[probe[1] + chunk] as number) &
              (matrix[probe[2] + chunk] as number) &
              lowest) !== 0
          ) {
            score += 4
            if (((matrix[probe[3] + chunk] as number) & lowest) !== 0) {
              score += ((matrix[probe[4] + chunk] as number) & lowest) !== 0 ? 2 : 1
            }
          }
        }
        if (score > minimum) {
          let cursor = filled < limit ? filled++ : limit - 1
          while (cursor > 0 && (scores[cursor - 1] as number) < score) {
            documents[cursor] = documents[cursor - 1] as number
            scores[cursor] = scores[cursor - 1] as number
            cursor--
          }
          documents[cursor] = (chunk << 5) | (31 - Math.clz32(lowest))
          scores[cursor] = score
          minimum = scores[limit - 1] as number
        }
      }
    }
    const results: Types.FuzzyResult[] = new Array<Types.FuzzyResult>(filled)
    for (let index = 0; index < filled; index++) {
      results[index] = {
        value: this.#values[documents[index] as number] as string,
        score: scores[index] as number
      }
    }
    return results
  }

  /**
   * Hash text into features.
   * @description Emits token, circumfix, and adjacent pair digests.
   * @param input - Text to encode
   * @returns Hashed feature digests
   */
  #digests(input: string): number[] {
    const golden = Table.golden
    const encoded = FuzzyNet.tokenizer.encode(input)
    const length = encoded.length
    const digests: number[] = []
    let window = 0
    let prefix = 0
    let digest = 0
    let previous = 0
    for (let index = 0; index <= length; index++) {
      const octet = index < length ? (encoded[index] as number) : 0
      if (octet >>> 6 !== 0) {
        window = (window << 8) | octet
        if (window >>> 24 !== 0) {
          if (prefix === 0) {
            prefix = (window << 8) >>> 16
          }
          digest = Math.imul(digest ^ ((window << 8) >>> 8), golden)
        }
        continue
      }
      if (window === 0) {
        continue
      }
      const current = digest !== 0
        ? Math.imul((prefix << 8) | ((window << 24) >>> 24), golden)
        : Math.imul(window, golden)
      if (digest !== 0) {
        digests.push(
          digest,
          Math.imul(((prefix >>> 8) << 16) | ((window << 16) >>> 16), golden)
        )
      }
      digests.push(current)
      if (previous !== 0) {
        digests.push(current ^ previous)
      }
      previous = Math.imul(current, golden)
      window = 0
      prefix = 0
      digest = 0
    }
    return digests
  }
}

/** Public fuzzy index types */
export type * from '@app/types.ts'
