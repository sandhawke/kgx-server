/*
  These are conversions from an RDF Dataset Pattern to a tuple.
  Basically, each one is equivalent to SPARQL "SELECT" tuple-elements
  WHERE dataset pattern.

  We're not using SPARQL at the moment, and it's unclear we want the
  same semantics as far as duplicates, optional, subselects, etc.
*/

// put into subdir?
const unshapeObserver = require('./unshape-observer')

const shapes = []
module.exports = shapes

shapes.push({
  name: 'rdf',
  description: 'no shape, just general RDF',
  applicable: () => true,
  fromRDF: x => x
})

shapes.push({
  name: 'quad',
  description: 'a general-purpose shape which applies to all RDF data, converting elements in an RDF Dataset (default graph + named graphs) into a set of 4-tuples (quads): <Subject, Predicate, Object, Graph>',
  applicable: () => true,
  fromRDF: (rdf) => {
    const out = rdf.map(({ subject, predicate, object, graph }) =>
      [subject, predicate, object, graph])
    out.columnLabels = ['Subject', 'Property', 'Value', 'Source Graph']
    out.isRows = true
    return out
  }
})

shapes.push({
  name: 'observation',
  description: 'an attributed observation (see credweb.org/signals)',
  applicable: () => true, // maybe check?   gray out if not?
  fromRDF: unshapeObserver.unshape
})

/*

shapes.push({
  name: '...',
  description: '...'
  fromRDF: (rdf) => {
    const out = ...
    out.columnLabels = []
    out.isRows = true
    return out
  }
})

*/

// Make shapes addressible by name as well as number.  Sketchy, I know.
for (const shape of shapes) {
  shapes[shape.name] = shape
}
