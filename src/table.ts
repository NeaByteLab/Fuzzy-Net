/**
 * Bitwise feature projection table.
 * @description Stores document bits across hashed feature cells.
 */
export default class Table {
  /** Feature cell count */
  static readonly cells = 1 << 16
  /** Cell index mask */
  static readonly filter = Table.cells - 1
  /** Odd golden ratio multiplier */
  static readonly golden = ((Math.sqrt(5) - 1) * (2 ** 31)) | 1
  /** Thirty-two document bit chunks */
  readonly chunks: number
  /** Flat document bit storage */
  readonly matrix

  /**
   * Allocate document bit storage.
   * @description Sizes one bit chunk for every thirty-two documents.
   * @param total - Indexed document count
   */
  constructor(total: number) {
    this.chunks = (total + 31) >>> 5
    this.matrix = new Uint32Array(Table.cells * this.chunks)
  }

  /**
   * Compute five probe offsets.
   * @description Mixes a digest into five matrix row starts.
   * @param digest - Feature hash digest
   * @returns Five matrix row offsets
   */
  probes(digest: number): readonly [number, number, number, number, number] {
    const filter = Table.filter
    const chunks = this.chunks
    const first = Math.imul(digest ^ (digest >>> 16), Table.golden)
    return [
      (digest & filter) * chunks,
      ((digest >>> 16) & filter) * chunks,
      (first & filter) * chunks,
      ((first >>> 16) & filter) * chunks,
      (Math.imul(first ^ (first >>> 16), Table.golden) & filter) * chunks
    ]
  }

  /**
   * Project one feature bit.
   * @description Sets primary bits, then overflow bits on collision.
   * @param digest - Feature hash digest
   * @param chunk - Document chunk index
   * @param marker - Document bit inside chunk
   */
  project(digest: number, chunk: number, marker: number): void {
    const filter = Table.filter
    const chunks = this.chunks
    const matrix = this.matrix
    const first = Math.imul(digest ^ (digest >>> 16), Table.golden)
    const primary = (digest & filter) * chunks + chunk
    const secondary = ((digest >>> 16) & filter) * chunks + chunk
    const tertiary = (first & filter) * chunks + chunk
    const overflow = ((first >>> 16) & filter) * chunks + chunk
    const cascade = (Math.imul(first ^ (first >>> 16), Table.golden) & filter) * chunks + chunk
    const matched = (matrix[primary] as number) &
      (matrix[secondary] as number) &
      (matrix[tertiary] as number) & marker
    matrix[cascade] = (matrix[cascade] as number) | ((matrix[overflow] as number) & matched)
    matrix[overflow] = (matrix[overflow] as number) | matched
    matrix[primary] = (matrix[primary] as number) | marker
    matrix[secondary] = (matrix[secondary] as number) | marker
    matrix[tertiary] = (matrix[tertiary] as number) | marker
  }
}
