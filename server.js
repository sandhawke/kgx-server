const rdfkb = require('rdfkb')
const express = require('express')
const H = require('escape-html-template-tag') // H.safe( ) if needed
const debug = require('debug')('signal-data-server')
const CSV = require('csv-string')
const querystring = require('querystring')

const datasets = new Map()

const app = express()
const port = 5511
const siteprefix = ''
let status = 'Loading datasets'

async function start () {
  // could move this to after the data is loaded if we want
  app.listen(port, () => console.log(`http://localhost:${port}!`))

  for (const name of ['demo-1' /*, 'zhang18' */ ]) {
    const kb = rdfkb.create()
    datasets.set(name, kb)
    await kb.aload(name + '.trig')
  }
  status = 'Ready'
}

// app.get(/^\/([^/]*)\/?/, async (req, res) => {

app.use('/static', express.static('static', {
  extensions: ['html']
}))

app.get('/', async (req, res) => {
  if (req.query.dataset) {
    return page(req, res)
  }
  const buf = []
  buf.push(H`<p>Datasets:</p><ol>`)
  for (const [key, value] of datasets) {
    buf.push(H`<li><a href="./${key}">${key}</a></li>`)
  }
  buf.push(H`</ol>`)
  res.send(buf.join('\n'))
})

app.get('/:dataset', async (req, res) => {
  res.redirect('/' + req.params.dataset + '/rows')
})
/*
function csv(req, res) {
  res.set('Content-Type', 'text/csv')
  res.send('A,B,C,D')
}
*/

// allow users to provide the suffice instead of doing con-neg
app.get('/:dataset/:model.:suffix', async (req, res) => {
  const f = {
    csv: csv,
    html: html,
    json: json,
    jsonld: jsonld
    // trig, nq, turle
  }[req.params.suffix]

  if (f) {
    f(req, res)
  } else {
    res.status(406).send('File Format Unknown')
  }
})

// but also support conneg, thanks
app.get('/:dataset/:model', async (req, res) => {
  res.format({
    html: html,
    json: json,
    'application/json+ld': jsonld,
    default: html
  })
})

function quadModel (req) {
  if (req.params.model && req.params.model.match(/^quads?|graphs?/)) {
    const dsname = req.params.dataset
    debug('dsname', dsname)
    const ds = datasets.get(dsname)
    debug('ds', ds)
    const quads = ds.getQuads()
    debug('quads', quads)
    return quads
  }
  return null
}

function csv (req, res) {
  res.set('Content-Type', 'text/csv')
  const quads = quadModel(req)
  if (quads) {
    const data = []
    data.push(['Subject', 'Property', 'Value', 'Graph'])
    for (const q of quads) {
      let val = q.object
      debug('val', val.datatype, val.value)
      if (val.datatype.id === 'http://www.w3.org/2001/XMLSchema#integer') {
        val = parseInt(val.value)
      } else {
        val = val.id
      }
      data.push([q.subject.id, q.predicate.id, val, q.graph.id])
    }
    res.send(CSV.stringify(data))
    return
  }
  res.send('Model not implemented')
}

function html (req, res) {
  debug('you asked for HTML, params=' + JSON.stringify(req.params))
  const quads = quadModel(req)
  if (quads) {
    // use data tables!!
    const data = []
    data.push(['Subject', 'Property', 'Value', 'Graph'])
    for (const q of quads) {
      let val = q.object
      debug('val', val.datatype, val.value)
      if (val.datatype && val.datatype.id === 'http://www.w3.org/2001/XMLSchema#integer') {
        val = parseInt(val.value)
      } else {
        val = val.id
      }
      data.push([q.subject.id, q.predicate.id, val, q.graph.id])
    }

    page(req, res, CSV.stringify(data))
    return
  }
  res.send('Not implemented')
}

/*
  Given the request parameters, extract the data that we'll end up
  showing in some format on some kind of page 

  p.dataset
  p.shape = quads | observations
  p.format = csv | json | ...
  p.return = html | data
  p.type = 'application/json+ld'    as an override if you want
  p.properties
*/
function extract (p) {
  const dsname = p.dataset

  const ds = datasets.get(dsname)
  const quads = ds.getQuads()

  // maybe turn into observations

  return quads
}

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

function tablify (quads) {
  const data = []
  // data.push(['Subject', 'Property', 'Value', 'Graph'])
  for (const q of quads) {
    let val = q.object
    debug('val', val.datatype, val.value)
    // this is a different operation, like ... makeTermsPresentable
    if (val.datatype && val.datatype.id === 'http://www.w3.org/2001/XMLSchema#integer') {
      val = parseInt(val.value)
    } else {
      val = val.id
    }
    data.push([q.subject.id, q.predicate.id, val, q.graph.id])
  }
  return data
}

function recognizeObservations (quads) {
  const data = []
  
  return data
}

function page (req, res) {
  const p = Object.assign({}, req.params, req.query)
  
  console.log('PARAMS', p)

  const data = extract(p)

  if (! p.format) p.format = 'json'
  let stringified = {
    csv: () => CSV.stringify(tablify(data)),
    json: () => JSON.stringify(data, null, 2)
  }[p.format]()

  if (p.return === 'raw') {
    let type = p.type
    if (!type) {
      type = {
        csv: 'text/csv',
        json: 'application/json'
      }[p.format]
    }
    res.set('Content-Type', type)
    res.send(stringified)
  }
  
  let title = 'signal data server'

  let dataset = H`${p.dataset}`
  // make dataset include the title and a link to an about page, if that's in there
  const kb = datasets.get(p.dataset)
  // WHATS MY URL?
  // How do I say dc:title?
  // Where is the last_modified to be found?  In the outer quadstore, someday.
  console.log(null, kb.namedNode('https://example.org/title'), kb.defaultGraph())
  const titles = kb.getObjects(null, kb.namedNode('https://example.org/title'), kb.defaultGraph())
  console.log('titles', titles)
  if (titles.length > 0) {
    dataset = H`${titles[0].value} (${dataset})`
    title += H` "${titles[0].value}"`
  }

  function url (pChanges) {
    const pTarget = Object.assign({}, p, pChanges)
    return H.safe('/?' + querystring.stringify(pTarget))
  }
  
  const nav = H`
<ul class="nav">
  <li>Model: <a href="quads">quads</a> | <a href="rows">rows</a></li>
  <li>Format: <a href="${url({format: 'table'})}">table</a> | <a href="${url({format: 'csv'})}">csv</a> | <a href="${url({format: 'json'})}">json</a></li>
  <li>Actions: <a href="${url({return: 'raw'})}">download</a></li></ul>
`
  // pop-out as action?   if ?framed=true
  
  res.send( /* NO H, ONLY TRUSTED DATA */`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="${siteprefix}/static/reset.css">
  <link rel="stylesheet" href="${siteprefix}/static/main.css">
  <title>${title}</title>
</head>
<body>
  <div class="header">
    <h2>${dataset}</h2>
    ${nav}
  </div>
  <div class="databox">${stringified}</div>
</body></html>
`)
}

// the difference between json and jsonld is ONLY what media-type we
// reply with.  The problem is that JSON stacks often can't handle the
// +ld.  Like firefox's JSON mode!

function json (req, res) {
  res.set('Content-Type', 'application/json')
  jsonCommon(req, res)
}

function jsonld (req, res) {
  res.set('Content-Type', 'application/json+ld')
  jsonCommon(req, res)
}

function jsonCommon (req, res) {
  const quads = quadModel(req)
  if (quads) {
    // use data tables!!
    const data = []
    data.push(['Subject', 'Property', 'Value', 'Graph'])
    for (const q of quads) {
      let val = q.object
      debug('val', val.datatype, val.value)
      if (val.datatype.id === 'http://www.w3.org/2001/XMLSchema#integer') {
        val = parseInt(val.value)
      } else {
        val = val.id
      }
      data.push([q.subject.id, q.predicate.id, val, q.graph.id])
    }
    res.send(data)
    return
  }
  res.send(req.params)
}

start()
