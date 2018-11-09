/*

We merge req.params and req.query into p.  These are the values we look for:
  
  p.dataset = a key into datasets map
  p.shape = quads | obs
  p.format = csv | json | ...
  p.return = html | data
  ---
  p.type = 'application/json+ld'    as an override if you want
  p.properties = list of properties to restrict view to  [BROKEN]
  p.framed = set to truthy in an iframe for a few differences

*/

const rdfkb = require('rdfkb')
const express = require('express')
const H = require('escape-html-template-tag') // H.safe( ) if needed
const debug = require('debug')('signal-data-server')
const CSV = require('csv-string')
const querystring = require('querystring')

const datasets = new Map()
rdfkb.defaultns.cred = 'http://www.w3.org/ns/credweb#'
  
const app = express()
const port = 5511
const siteprefix = 'http://localhost:5511'

let status = 'Loading datasets'

async function start () {
  // could move this to after the data is loaded if we want
  app.listen(port, () => console.log(`http://localhost:${port}!`))

  for (const name of ['demo-1', 'demo-2' /*, 'zhang18' */ ]) {
    const kb = rdfkb.create()
    datasets.set(name, kb)

    if (true) {
      await kb.aload(`${name}.trig`, { baseIRI: siteprefix + '/static/' + name })
    } else {
      // cute, but ldfetch isn't getting the base right
      const url = siteprefix + '/static/' + name
      await kb.aload(url)
    }
  }
  status = 'Ready'
}

// app.get(/^\/([^/]*)\/?/, async (req, res) => {

app.use('/static', express.static('static', {
  extensions: ['html', 'trig', 'nq', 'ttl', 'json', 'jsonld'],
  setHeaders: function (res, path, stat) {
    if (path.endsWith('.trig')) res.set('Content-Type', 'application/trig')
  }
}))

app.get('/', async (req, res) => {
  if (!req.query.dataset) req.query.dataset = 'demo-1'
  return page(req, res)
})

app.get('/_list/',   async (req, res) => {
  const buf = []
  buf.push(H`<p>Datasets:</p><ol>`)
  for (const [key, value] of datasets) {
    buf.push(H`<li><a href="./${key}">${key}</a></li>`)
  }
  buf.push(H`</ol>`)
  res.send(buf.join('\n'))
})

app.get('/:dataset', async (req, res) => {
  res.redirect('/' + req.params.dataset + '/quads')
})

// allow users to provide the suffix instead of doing con-neg
app.get('/:dataset/:shape.:format', (req, res) => {
  if (['html', ''].includes(req.params.format)) {
    req.params.return = 'html'
  } else {
    req.params.return = 'raw'
  }
  return page(req, res)
})

// but also support conneg, thanks
app.get('/:dataset/:shape', async (req, res) => {
  if (!datasets.get(req.params.dataset)) {
    console.log('404', req.url)
    return res.status(404).send('' + H`No such dataset, "${req.params.dataset}"`)
  }
  function html (req, res) { return page(req, res) }
  res.format({
    html,
    json: (req, res) => { req.params.format='json'; return page(req, res) },
    'application/json+ld': (req, res) => {
      req.params.type='application/json+ld'
      req.params.format='json'
      return page(req, res)
    },
    default: html
  })
})


/*
  Given the request parameters, extract the data that we'll end up
  showing in some format on some kind of page 

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

  if (!p.format) p.format = 'json'
  if (!p.shape) p.shape = 'quads'
  
  const stringifier = {
    csv: () => CSV.stringify(tablify(data)),
    json: () => JSON.stringify(data, null, 2)
  }[p.format]
  if (!stringifier) {
    return res.status(406).send('' + H`Unimplemented data format "${p.format}"`)
  }
  const stringified = stringifier()


  if (p.return === 'raw') {
    let type = p.type
    if (!type) {
      type = {
        csv: 'text/csv',
        json: 'application/json'
      }[p.format]
    }
    res.set('Content-Type', type)
    return res.send(stringified)
  }
  
  let title = 'signal data server'

  let dataset = H`${p.dataset}`
  // make dataset include the title and a link to an about page, if that's in there
  const kb = datasets.get(p.dataset)
  // WHATS MY URL?
  // How do I say dc:title?
  // Where is the last_modified to be found?  In the outer quadstore, someday.
  console.log(null, kb.ns.dc.title, kb.defaultGraph())
  const titles = kb.getObjects(null, kb.ns.dc.title, kb.defaultGraph())
  console.log('titles', titles)
  if (titles.length > 0) {
    dataset = H`${titles[0].value} (${dataset})`
    title += H` "${titles[0].value}"`
  }

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
    const u = H.safe(siteprefix + '/' + path + q)
    debug('url constructed', u)
    return u
  }
  
  const nav = H`
<ul class="nav">
  <li>Shape: <a href="${url({shape: 'quads'})}">quads</a> | <a href="${url({shape: 'obs'})}">observations</a></li>
  <li>Format: <a href="${url({format: 'table'})}">table</a> | <a href="${url({format: 'csv'})}">csv</a> | <a href="${url({format: 'json'})}">json</a></li>
  <li>Actions: <a href="${url({return: 'raw'})}">download</a></li></ul>
`
  // pop-out as action?   if ?framed=true

  let upperNav
  if (p.framed) {
    upperNav = H`<div style="float: right"><a href="${url()}" target="_blank">New Tab</a></div>`
  } else {
    const buf = []
    for (const [key, value] of datasets) {
      if (buf.length <= 5) {
        buf.push(H`<a href="${url({dataset: key})}">${key}</a>`)
      } else {
        buf.push(H`<a href="${siteprefix}/_list"><i>(more)</i></a>`)
        break
      }
    }

    upperNav = H`<ul class="nav" style="margin-bottom: 0.9em; margin-top: -1.2em">
       <li><a href="/">Home</a></li>
       <li>Datasets: ${H.safe(buf.join(' | '))}</li>
       <li><a href="/static/about">about</a></li></ul>`
  }
  return res.send( /* NO H, ONLY TRUSTED DATA */`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="${siteprefix}/static/reset.css">
  <link rel="stylesheet" href="${siteprefix}/static/main.css">
  <title>${title}</title>
</head>
<body>
  <div class="header">
    ${upperNav}
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

start()
