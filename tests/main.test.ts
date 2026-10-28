import * as Assert from '@std/assert'
import FuzzyNet from '@app/index.ts'

Deno.test('FuzzyNet - handles empty document corpus', () => {
  const engine = new FuzzyNet([])
  const results = engine.search('convolutional neural network')
  Assert.assertEquals(results.length, 0)
})

Deno.test('FuzzyNet - indexes and searches across multiple 32-document chunks', () => {
  const documents: string[] = []
  for (let index = 0; index < 75; index++) {
    documents.push(`Unrelated background entry number ${index}`)
  }
  documents[0] = 'First chunk convolutional neural network'
  documents[35] = 'Second chunk distributed consensus protocol'
  documents[70] = 'Third chunk variational autoencoder latent space'
  const engine = new FuzzyNet(documents)
  const first = engine.search('convolutional neural network', 1)
  const second = engine.search('distributed consensus protocol', 1)
  const third = engine.search('variational autoencoder latent space', 1)
  Assert.assertEquals(first[0]?.value, documents[0])
  Assert.assertEquals(second[0]?.value, documents[35])
  Assert.assertEquals(third[0]?.value, documents[70])
})

Deno.test('FuzzyNet.search - boosts documents with repeated query term occurrences', () => {
  const documents = [
    'neural architecture overview',
    'neural network with neural layers and neural weights'
  ]
  const engine = new FuzzyNet(documents)
  const results = engine.search('neural', 2)
  Assert.assertEquals(results.length, 2)
  Assert.assertEquals(results[0]?.value, documents[1])
  Assert.assertEquals((results[0]?.score as number) > (results[1]?.score as number), true)
})

Deno.test('FuzzyNet.search - defaults limit to 10 results', () => {
  const documents: string[] = []
  for (let index = 0; index < 20; index++) {
    documents.push(`Shared keyword entry variant ${index}`)
  }
  const engine = new FuzzyNet(documents)
  const results = engine.search('Shared keyword entry')
  Assert.assertEquals(results.length, 10)
})

Deno.test('FuzzyNet.search - degrades score monotonically as typo distance increases', () => {
  const target = 'Convolutional neural network architecture for visual recognition'
  const engine = new FuzzyNet([
    target,
    'Unrelated article about planetary orbits and astrophysics'
  ])
  const exact = engine.search('Convolutional neural network', 1)[0]?.score as number
  const oneTypo = engine.search('Convolutonal neural network', 1)[0]?.score as number
  const twoTypos = engine.search('Convolutonal neural netwrk', 1)[0]?.score as number
  const threeTypos = engine.search('Convolutonal neral netwrk', 1)[0]?.score as number
  Assert.assertEquals(exact > oneTypo, true)
  Assert.assertEquals(oneTypo > twoTypos, true)
  Assert.assertEquals(twoTypos > threeTypos, true)
  Assert.assertEquals(threeTypos > 0, true)
})

Deno.test('FuzzyNet.search - matches short tokens of 1 to 3 characters', () => {
  const documents = [
    'But my NCP costs 500 a day',
    'Distributed Node Consensus Protocol'
  ]
  const engine = new FuzzyNet(documents)
  const results = engine.search('But my NCP a day', 1)
  Assert.assertEquals(results.length, 1)
  Assert.assertEquals(results[0]?.value, documents[0])
})

Deno.test('FuzzyNet.search - ranks exact match above typo match', () => {
  const documents = [
    'Convolutonal neural netwrk draft',
    'Convolutional neural network reference'
  ]
  const engine = new FuzzyNet(documents)
  const results = engine.search('Convolutional neural network', 2)
  Assert.assertEquals(results[0]?.value, documents[1])
  Assert.assertEquals((results[0]?.score as number) > (results[1]?.score as number), true)
})

Deno.test('FuzzyNet.search - ranks results in descending score order', () => {
  const documents = [
    'Markov',
    'Markov chain',
    'Markov chain Monte Carlo',
    'Markov chain Monte Carlo sampling'
  ]
  const engine = new FuzzyNet(documents)
  const results = engine.search('Markov chain Monte Carlo sampling', 4)
  Assert.assertEquals(results.length, 4)
  for (let index = 1; index < results.length; index++) {
    Assert.assertEquals(
      (results[index - 1]?.score as number) >= (results[index]?.score as number),
      true
    )
  }
  Assert.assertEquals(results[0]?.value, documents[3])
})

Deno.test('FuzzyNet.search - recovers top document under character deletion typos', () => {
  const documents = [
    'Active Support Vector Machine Classification',
    'The Sound of an Album Cover: A Probabilistic Approach',
    'Faster ODE Adjoints via Seminorms'
  ]
  const engine = new FuzzyNet(documents)
  Assert.assertEquals(engine.search('Suport vectr machne', 1)[0]?.value, documents[0])
  Assert.assertEquals(engine.search('The Sond of an Albm Covr', 1)[0]?.value, documents[1])
  Assert.assertEquals(engine.search('Fastr ODE Adjonts via Semnorms', 1)[0]?.value, documents[2])
})

Deno.test('FuzzyNet.search - recovers top document under character transposition typos', () => {
  const documents = [
    'Distributed Node Consensus Protocol',
    'Wikipedia - Natural language processing',
    'Variational Autoencoder with Learned Latent Structure'
  ]
  const engine = new FuzzyNet(documents)
  const results = engine.search('Distribtued Node Consenus Protcol', 1)
  Assert.assertEquals(results[0]?.value, documents[0])
})

Deno.test('FuzzyNet.search - respects positive result limit', () => {
  const documents = [
    'Alpha beta gamma',
    'Alpha beta delta',
    'Alpha beta epsilon'
  ]
  const engine = new FuzzyNet(documents)
  const results = engine.search('Alpha beta', 2)
  Assert.assertEquals(results.length, 2)
})

Deno.test('FuzzyNet.search - returns empty array for empty or punctuation-only query', () => {
  const engine = new FuzzyNet(['Convolutional neural network'])
  Assert.assertEquals(engine.search('').length, 0)
  Assert.assertEquals(engine.search('   !@#$%^&*()_+-=   ').length, 0)
  Assert.assertEquals(engine.search('12345 67890').length, 0)
})

Deno.test('FuzzyNet.search - returns empty array when limit is zero or negative', () => {
  const engine = new FuzzyNet(['Convolutional neural network'])
  Assert.assertEquals(engine.search('Convolutional', 0).length, 0)
  Assert.assertEquals(engine.search('Convolutional', -5).length, 0)
})

Deno.test('FuzzyNet.search - returns empty array when no documents match query', () => {
  const engine = new FuzzyNet(['Convolutional neural network'])
  const results = engine.search('zzzzxxxxqqqqwwww')
  Assert.assertEquals(results.length, 0)
})

Deno.test('FuzzyNet.search - rewards adjacent word order via coupled digests', () => {
  const documents = [
    'cover sound album probabilistic approach',
    'sound album cover probabilistic approach'
  ]
  const engine = new FuzzyNet(documents)
  const results = engine.search('sound album cover', 2)
  Assert.assertEquals(results[0]?.value, documents[1])
  Assert.assertEquals((results[0]?.score as number) > (results[1]?.score as number), true)
})
