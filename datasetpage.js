const H = require('escape-html-template-tag')
const debug = require('debug')('datasetpage')
const sitepage = require('./sitepage')
const shapes = require('./shapes')
const formats = require('./formats')

/*
  Given the request parameters, extract the data that we'll end up
  showing in some format on some kind of page

*/
function extract (datasets, datasetName) {
  const ds = datasets.get(datasetName)
  if (!ds) return undefined
  const rdf = ds.getQuads()
  rdf.isRDF = true
  rdf.fromDataset = ds // to get ns prefixes
  return rdf
}

function narrow (properties, quads) {
  const out = []
  const expr = RegExp(properties)
  let use
  for (const q of quads) {
    if (q.predicate.value.match(expr)) {
      out.push(q)
    }
  }
  return out
}

function datasetpage (req, res) {
  const p = Object.assign({}, req.params, req.query)
  debug('PARAMS', p)

  // default state values
  // need to set req.params so req.stateURL can see these values :-(
  //
  // maybe better to do these as redirects?  no, the blank URLs look better
  //
  if (!p.shape) {
    // res.redirect(req.stateURL({ shape: 'rdf' }))
    p.shape = 'rdf'
    req.param.shape = p.shape
  }
  if (!p.format) {
    // res.redirect(req.stateURL({ format: 'json' }))
    p.format = 'json'
    req.param.format = 'json'
  }

  let rdfdata = extract(req.appmgr.datasets, p.dataset)
  if (!rdfdata) {
    res.status(404).send(H`No dataset loaded called "${p.dataset}"`)
    return
  }

  if (p.properties) {
    rdfdata = narrow(p.properties, rdfdata)
    // SHOW RESTRICTION IN UI
  }
  
  // apply shape

  let data
  const shape = shapes[p.shape]
  debug('shape name %j got shape %j', p.shape, shape)
  if (shape) {
    data = shape.fromRDF(rdfdata)
    if (!Array.isArray(data)) throw Error('non-array returned from .fromRDF for ', p.shape)
  } else {
    throw Error('internal logic')
  }

  const kb = req.appmgr.datasets.get(p.dataset)

  // apply format
  
  let stringified
  let ok = false
  const format = formats[p.format]
  if (format) {
    if (format.applicable(data)) {

      // The nodestr is a function to turn nodes into strings for this format.
      // We have this decoupled because we're expecting to have some UI around
      // this, like which linkstyle, which datastyle, etc.
      
      let mknodestr = formats[p.format].makeNodeStr
      let nodestr
      if (mknodestr) {
        nodestr = mknodestr(kb, x => req.stateURL({url: x}))
        console.log('nodestr=', nodestr)
      }
      const stringifier = formats[p.format].stringifier
      if (stringifier) {
        stringified = stringifier(data, nodestr)
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

  // Should be using a THIS to get the dataset title
  const titles = kb.getObjects(null, kb.ns.dc.title, kb.defaultGraph())
  debug('titles', titles)
  if (titles.length > 0) {
    h1 = H`${titles[0].value} (${h1})`
    title += H` "${titles[0].value}"`
  }

  // should be using a THIS
  // const license = getLicense(null, kb)
  h1 = h1 + H` (License not checked)`

  const url = req.stateURL

  /* 
     return the HTML to use for the button-tab to choose this item,
     which is a "shape" or "format" (one of those words is the
     paramKey)

     Something like  <a href="${url({ shape: 'quads' })}">quads</a>
  */
  function button (paramKey) {
    return function (item) {
      const stateChange = {}
      stateChange[paramKey] = item.name
      const link = url(stateChange)
      const text = item.label || item.name
      debug('generating button for a %s named %s, selected is %s',
            paramKey, item.name, p[paramKey])
      let out
      if (item.name === p[paramKey]) {
        out = H`<span class="selected">${text}</span>`
      } else {
        out = H`<a href="${link}">${text}</a>`
      }
      debug(' ... ', out)
      return out
    }
  }
  
  const shapesHTML = shapes.filter(x => x.applicable(rdfdata)).map(button('shape')).join(' | ')
  const formatsHTML = formats.filter(x => x.applicable(data)).map(button('format')).join(' | ')

  const nav = H`
<ul class="nav">
  <li>Shape: ${H.safe(shapesHTML)}</li>
  <li>Formats: ${H.safe(formatsHTML)}</li>
  <li>Actions: <a href="${url({ return: 'raw' })}">download</a></li></ul>
`

  const config = {
    title,
    h1,
    nav,
    mainbody: H`<div class="databox">${stringified}</div>`
  }
  sitepage(config)(req, res)
}

// move this into kgx?
function getLicense (self, kb) {
  return 'Not Checked'
  
  const set = new Set()
  for (const rel of [
    kb.ns.dct.license,  // pre http://dublincore.org/documents/dcmi-terms/
    kb.ns.cc.license, // per https://www.w3.org/TR/xhtml-rdfa-primer
    kb.ns.sorg.license, // per https://schema.org/license
    kb.ns.linkrel.license, 
    kb.named('https://www.w3.org/1999/xhtml/vocab#license')  // per https://labs.creativecommons.org/2011/ccrel-guide/
  ]) {
    kb.forObjects(obj => {
      console.log('found license', obj)
      set.add(obj)
    }, self, rel, kb.DG)
  }
  console.log('LICENSES:', set)
  //
  return 'NOT FOUND'
}

module.exports = datasetpage
