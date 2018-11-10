const H = require('escape-html-template-tag')
const debug = require('debug')('datasetpage')
const sitepage = require('./sitepage')
const unshapeObserver = require('./unshape-observer')
const formats = require('./formats')

/*
  Given the request parameters, extract the data that we'll end up
  showing in some format on some kind of page

*/
function extract (datasets, datasetName) {
  const ds = datasets.get(datasetName)
  const rdf = ds.getQuads()
  rdf.isRDF = true
  rdf.fromDataset = ds // to get ns prefixes
  return rdf
}

// convert isQuads to isRows without any recognizing; do this
// to see if additional formats will be appicable on the quads
//
// are there any formats that only work on quads, not rows?  Sure,
// all the RDF syntaxes.
//    MAYBE make this manual via:
//       shape: rdf | quads | observations
// where quads is rdf rowified [SPOG], so other formats work.
//
// unshapeObservations will result in both isRows and isObservations
// I believe, so CSV works, as might some observations-specific formats
// -- some JSON-LD context?
//

function rowify (rdfdata) {
  if (!rdfdata.isRDF) throw Error()
  const out = rdfdata.map(({ subject, predicate, object, graph }) =>
    [subject, predicate, object, graph])
  out.columnLabels = ['Subject', 'Property', 'Value', 'Source Graph']
  out.isRows = true
  return out
}

/*
  function narrow (properties, quads) {
  const out = []
  let use
  for (const q of quads) {
  if (quads.graph === rdfkb.DefaultGraph) {
  use = true
  } else {
  let match = q.property.id.match(/(\w+)$/)
  if (match) {
  const tail = match[0]
  if (properties.includes(tail)) {
  use = true
  } else {
  use = false
  }
  } else {
  use = true
  }
  }
  if (use) out.push(q)
  }
  return out
  }

*/

function datasetpage (req, res) {
  const p = Object.assign({}, req.params, req.query)
  debug('PARAMS', p)

  // default state values
  // need to set req.params so req.stateURL can see these values :-(
  // maybe better to do these as redirects?
  if (!p.shape) {
    res.redirect(req.stateURL({ shape: 'rdf' }))
    return
  }
  if (!p.format) {
    res.redirect(req.stateURL({ format: 'json' }))
    return
  }
  /*
    instead of
  if (!p.format) { p.format = 'json'; req.params.format = p.format }
  if (!p.shape) { p.shape = 'rdf'; req.params.shape = p.shape }
  */

  let rdfdata = extract(req.siteconfig.datasets, p.dataset)

  let data = rdfdata
  if (p.shape === 'quads') {
    data = rowify(rdfdata)
  } else if (p.shape === 'obs') {
    data = unshapeObserver.unshape(rdfdata)
  }

  let stringified
  let ok = false
  const format = formats[p.format]
  if (format) {
    if (format.applicable(data)) {
      const stringifier = formats[p.format].stringifier
      if (stringifier) {
        stringified = stringifier(data)
        ok = true
      } else {
        stringified = 'Format is missing its stringifier'
      }
    } else {
      stringified = 'Format not applicable for this shape'
    }
  } else {
    stringified = 'No format selected'
  }

  if (p.return === 'raw') {
    if (ok) {
      let type = p.type
      if (!type) type = format.type
      res.set('Content-Type', type)
      res.send(stringified)
    } else {
      res.status(404).send(stringified)
    }
    return
  }

  let title = 'signal data server'

  let h1 = H`${p.dataset}`

  const kb = req.siteconfig.datasets.get(p.dataset)
  // WHATS MY URL?
  // How do I say dc:title?
  // Where is the last_modified to be found?  In the outer quadstore, someday.
  const titles = kb.getObjects(null, kb.ns.dc.title, kb.defaultGraph())
  debug('titles', titles)
  if (titles.length > 0) {
    h1 = H`${titles[0].value} (${h1}, Licence Not Found)`
    title += H` "${titles[0].value}"`
  }

  const url = req.stateURL
  /*
    function url (pChanges) {
    const pp = Object.assign({}, p, pChanges)
    debug('url for', p, pChanges)
    let path = ''
    // pull out dataset, shape, format, and return
    if (pp.dataset && pp.shape && pp.format) {
    if (pp.return === 'raw') {
    path = H`${pp.dataset}/${pp.shape}.${pp.format}`
    delete pp.format
    } else {
    path = H`${pp.dataset}/${pp.shape}`
    }
    delete pp.dataset
    delete pp.shape
    delete pp.return
    }
    let q = '?' + querystring.stringify(pp)
    if (q === '?') q = ''
    const u = H.safe(siteconfig.prefix + '/' + path + q)
    debug('url constructed', u)
    return u
    }
  */

  const nav = H`
<ul class="nav">
  <li>Shape: <a href="${url({ shape: 'quads' })}">quads</a> | <a href="${url({ shape: 'obs' })}">observations</a></li>
  <li>Format: <a href="${url({ format: 'table' })}">table</a> | <a href="${url({ format: 'csv' })}">csv</a> | <a href="${url({ format: 'json' })}">json</a></li>
  <li>Actions: <a href="${url({ return: 'raw' })}">download</a></li></ul>
`
  /*
    let upperNav
    if (p.framed) {
    upperNav = H`<div style="float: right"><a href="${url()}" target="_blank">New Tab</a></div>`
    } else {
    const buf = []
    for (const [key, value] of siteconfig.datasets) {
    if (buf.length <= 5) {
    buf.push(H`<a href="${url({ dataset: key })}">${key}</a>`)
    } else {
    buf.push(H`<a href="${siteconfig.prefix}/_list"><i>(more)</i></a>`)
    break
    }
    }

    upperNav = H`<ul class="nav" style="margin-bottom: 0.9em; margin-top: -1.2em">
    <li><a href="/">Home</a></li>
    <li>Datasets: ${H.safe(buf.join(' | '))}</li>
    <li><a href="about">About</a></li></ul>`
    }
  */

  const config = {
    title,
    h1,
    nav,
    mainbody: `<div class="databox">${stringified}</div>`
  }
  sitepage(config)(req, res)
}

// the difference between json and jsonld is ONLY what media-type we
// reply with.  The problem is that JSON stacks often can't handle the
// +ld.  Like firefox's JSON mode!

module.exports = datasetpage
