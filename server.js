const rdfkb = require('rdfkb')
const express = require('express')
const H = require('escape-html-template-tag') // H.safe( ) if needed
const debug = require('debug')('signal-data-server')
const CSV = require('csv-string')

const datasets = new Map()

const app = express()
const port = 5511
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

app.get('/', async (req, res) => {
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
      if (val.datatype.id === 'http://www.w3.org/2001/XMLSchema#integer') {
        val = parseInt(val.value)
      } else {
        val = val.id
      }
      data.push([q.subject.id, q.predicate.id, val, q.graph.id])
    }
    const model = req.params.model
    const nav = H`
<p>Model: <a href="quads">quads</a> | <a href="rows">rows</a><br />
Format: <a href="./${model}.html">html</a> | <a href="./${model}.csv">csv</a> | <a href="./${model}.json">json</a></p>
`
    res.send(nav + CSV.stringify(data))
    return
  }
  res.send('Not implemented')
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
