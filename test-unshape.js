const test = require('tape')
const debug = require('debug')('test-unshape')
const rdfkb = require('rdfkb')
const unshape = require('./unshape-observer')
rdfkb.defaultns.cred = 'http://www.w3.org/ns/credweb#'

test(t => {
  const kb = rdfkb.create()
  kb.aload('demo-1.trig', { baseIRI: 'tag:hawke.org,2018:junk:' }).then(() => {
    const gr = kb.DG
    const out = []
    unshape.forEach(kb, gr, (shape) => {
      debug('FOUND SHAPE', shape)
      out.push(shape)
    })
    t.deepEqual(out,
      [ { user: { id: 'https://example.org/user1' },
        graph: { id: '_:b0_obs1' },
        postTime:
                    { id: '"1950-01-01"^^http://www.w3.org/2001/XMLSchema#date' },
        startTime: { id: '"time"' },
        endTime: { id: '"time2"' },
        subject: { id: 'https://example.org/article1' },
        property: { id: 'http://www.w3.org/ns/credweb#credibiltiyRating' },
        value: { id: '"2"^^http://www.w3.org/2001/XMLSchema#integer' } },
      { user: { id: 'https://example.org/user1' },
        graph: { id: '_:b0_obs2' },
        postTime: undefined,
        startTime: { id: '"time"' },
        endTime: undefined,
        subject: { id: 'https://example.org/article2' },
        property: { id: 'http://www.w3.org/ns/credweb#isOriginal' },
        value: { id: '"true"^^http://www.w3.org/2001/XMLSchema#boolean' } } ]
    )
    t.end()
  })
})
