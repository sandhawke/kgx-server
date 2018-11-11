const rdfkb = require('rdfkb')
rdfkb.defaultns.cred = 'http://www.w3.org/ns/credweb#'

const api = {}
module.exports = api

/*
  Look through the kb, outward from the given homeGraph, for
  Observations.  Call cb with any we find, synchronously.

  Note that shapes traverse graph boundaries!

  WHERE
    GRAPH ?g { ?s ?p ?o }
    ?g :user ?u
    ?g :postTime ?t
    OPTIONAL ?g :startTime ?t0
    OPTIONAL ?g :endTime ?t1

  but we're just going to do it manually
     - match ?g :user ?u
        for that ?g there should be only one s/p/o
        and at most one starttime and endtime
*/
api.forEach = (kb, homeGraph, cb) => {
  console.log('home', homeGraph)
  kb.forEach((q) => {
    const row = {}
    console.log('found key quad', q)
    row.user = q.object
    row.graph = q.subject

    row.postTime = kb.only(row.graph, kb.ns.cred.postTime, homeGraph)
    row.startTime = kb.only(row.graph, kb.ns.cred.startTime, homeGraph)
    row.endTime = kb.only(row.graph, kb.ns.cred.endTime, homeGraph)

    // we're only expecting one triple in the graph, but if there
    // are several, each becomes a new observation.
    kb.forEach(q => {
      row.subject = q.subject
      row.property = q.predicate
      row.value = q.object
      console.log('FOUND ROW', row)
      cb(row)
    }, null, null, null, row.graph)
  }, null, kb.ns.cred.observer, null, homeGraph)
}

api.unshape = (quads) => {
  const kb = rdfkb.create()
  for (const q of quads) kb.addQuad(q)
  const out = []
  function tuplify ({user, graph, postTime, startTime, endTime, subject, property, value}) {
    return [user, subject, property, value, graph, postTime, startTime, endTime]
  }
  out.columnLabels = ['Observer', 'Subject', 'Property', 'Value Observed', 'Source', 'Time Posted', 'Time Started', 'Time Ended']
  api.forEach(kb, kb.DG, row => out.push(row))
  console.log('FOUND SHAPES', out)
  out.isRows = true
  return out
}
