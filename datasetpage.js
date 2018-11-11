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
  
  // apply format
  
  let stringified
  let ok = false
  const format = formats[p.format]
  if (format) {
    if (format.applicable(data)) {

      // apply valuemap
      if (data.isRows) {
        function present (v) {
          // if it's a user, we want the label???
          if (!v) return v
          if (v.termType === 'Literal'
              && v.datatype.value === 'http://www.w3.org/2001/XMLSchema#date') {
            return (new Date(v.value)).toISOString()
          }
          return v.value
        }
        debug('mapping: data is %j', data)
        // splice instead of resetting, because we have our isRows flag
        // which is a stupid hack, and we should switch to a Table object
        data.splice(0, data.length, ...(data.map(x => x.map(present))))
      }
      
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

  const kb = req.appmgr.datasets.get(p.dataset)
  // WHATS MY URL?
  // How do I say dc:title?
  // Where is the last_modified to be found?  In the outer quadstore, someday.
  const titles = kb.getObjects(null, kb.ns.dc.title, kb.defaultGraph())
  debug('titles', titles)
  if (titles.length > 0) {
    h1 = H`${titles[0].value} (${h1}, License Not Found)`
    title += H` "${titles[0].value}"`
  }

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
    mainbody: `<div class="databox">${stringified}</div>`
  }
  sitepage(config)(req, res)
}

// the difference between json and jsonld is ONLY what media-type we
// reply with.  The problem is that JSON stacks often can't handle the
// +ld.  Like firefox's JSON mode!

module.exports = datasetpage
