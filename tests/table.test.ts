import * as Assert from '@std/assert'
import Table from '@app/table.ts'

Deno.test('Table - allocates one chunk for 1 to 32 documents', () => {
  const single = new Table(1)
  const boundary = new Table(32)
  Assert.assertEquals(single.chunks, 1)
  Assert.assertEquals(single.matrix.length, Table.cells)
  Assert.assertEquals(boundary.chunks, 1)
  Assert.assertEquals(boundary.matrix.length, Table.cells)
})

Deno.test('Table - allocates second chunk at 33 documents', () => {
  const table = new Table(33)
  Assert.assertEquals(table.chunks, 2)
  Assert.assertEquals(table.matrix.length, Table.cells * 2)
})

Deno.test('Table - allocates zero chunks for zero documents', () => {
  const table = new Table(0)
  Assert.assertEquals(table.chunks, 0)
  Assert.assertEquals(table.matrix.length, 0)
})

Deno.test('Table - static constants have expected bit values', () => {
  Assert.assertEquals(Table.cells, 65536)
  Assert.assertEquals(Table.filter, 65535)
  Assert.assertEquals(Table.golden & 1, 1)
})

Deno.test('Table.probes - maps distinct digests to distinct probe tuples', () => {
  const table = new Table(32)
  const first = table.probes(0x11112222)
  const second = table.probes(0x33334444)
  Assert.assertNotEquals(first, second)
})

Deno.test('Table.probes - returns five chunk-aligned row offsets', () => {
  const table = new Table(96)
  const offsets = table.probes(0x12345678)
  Assert.assertEquals(offsets.length, 5)
  for (let index = 0; index < offsets.length; index++) {
    const offset = offsets[index] as number
    Assert.assertEquals(offset % table.chunks, 0)
    Assert.assertEquals(offset >= 0 && offset < table.matrix.length, true)
  }
})

Deno.test('Table.probes - returns zero offsets when chunk count is zero', () => {
  const table = new Table(0)
  const offsets = table.probes(0xdeadbeef)
  Assert.assertEquals(offsets, [0, 0, 0, 0, 0])
})

Deno.test('Table.project - isolates bit markers across different chunks', () => {
  const table = new Table(64)
  const digest = 0x13572468
  const offsets = table.probes(digest)
  table.project(digest, 0, 1 << 3)
  table.project(digest, 1, 1 << 7)
  Assert.assertEquals(table.matrix[offsets[0]], 1 << 3)
  Assert.assertEquals(table.matrix[offsets[0] + 1], 1 << 7)
})

Deno.test('Table.project - preserves existing document bits within the same chunk', () => {
  const table = new Table(32)
  const digest = 0x24681357
  const offsets = table.probes(digest)
  table.project(digest, 0, 1 << 0)
  table.project(digest, 0, 1 << 31)
  const expected = (1 << 0) | (1 << 31)
  Assert.assertEquals(table.matrix[offsets[0]]! | 0, expected)
  Assert.assertEquals(table.matrix[offsets[1]]! | 0, expected)
  Assert.assertEquals(table.matrix[offsets[2]]! | 0, expected)
  Assert.assertEquals(table.matrix[offsets[3]], 0)
  Assert.assertEquals(table.matrix[offsets[4]], 0)
})

Deno.test('Table.project - promotes second projection to overflow cell', () => {
  const table = new Table(32)
  const digest = 0xCAFEBABE
  const offsets = table.probes(digest)
  const marker = 1 << 11
  table.project(digest, 0, marker)
  table.project(digest, 0, marker)
  Assert.assertEquals(table.matrix[offsets[0]], marker)
  Assert.assertEquals(table.matrix[offsets[1]], marker)
  Assert.assertEquals(table.matrix[offsets[2]], marker)
  Assert.assertEquals(table.matrix[offsets[3]], marker)
  Assert.assertEquals(table.matrix[offsets[4]], 0)
})

Deno.test('Table.project - promotes third projection to cascade cell', () => {
  const table = new Table(32)
  const digest = 0xCAFEBABE
  const offsets = table.probes(digest)
  const marker = 1 << 15
  table.project(digest, 0, marker)
  table.project(digest, 0, marker)
  table.project(digest, 0, marker)
  Assert.assertEquals(table.matrix[offsets[0]], marker)
  Assert.assertEquals(table.matrix[offsets[1]], marker)
  Assert.assertEquals(table.matrix[offsets[2]], marker)
  Assert.assertEquals(table.matrix[offsets[3]], marker)
  Assert.assertEquals(table.matrix[offsets[4]], marker)
})

Deno.test('Table.project - sets primary secondary and tertiary bits on first projection', () => {
  const table = new Table(32)
  const digest = 0xABCDEF01
  const offsets = table.probes(digest)
  const marker = 1 << 5
  table.project(digest, 0, marker)
  Assert.assertEquals(table.matrix[offsets[0]], marker)
  Assert.assertEquals(table.matrix[offsets[1]], marker)
  Assert.assertEquals(table.matrix[offsets[2]], marker)
  Assert.assertEquals(table.matrix[offsets[3]], 0)
  Assert.assertEquals(table.matrix[offsets[4]], 0)
})
