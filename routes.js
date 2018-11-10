const express = require('express')
const debug = require('debug')('routes')
const H = require('escape-html-template-tag') // H.safe( ) if needed
const querystring = require('querystring')
const sitepage = require('./sitepage')
const datasetpage = require('./datasetpage')

const router = express.Router()

/*
  Add a req.stateURL function which gives back a URL to this site with
  some altered state, as given by the arg, which is an overlay to our
  state from params+query

  This needs to match the routes, which is why it's here.
*/
router.use('/', (req, res, next) => {
  req.stateURL = (pChanges) => {
    const p = Object.assign({}, req.params, req.query)
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
    const u = H.safe(req.siteconfig.prefix + '/' + path + q)
    debug('url constructed', u)
    return u
  }
  next()
})

router.get('/test', (req, res, next) => {
  res.send(`At /test, req.route = ${req.stateURL}`)
})

router.use('/static', express.static('static', {
  extensions: ['html', 'trig', 'nq', 'ttl', 'json', 'jsonld'],
  setHeaders: function (res, path, stat) {
    if (path.endsWith('.trig')) res.set('Content-Type', 'application/trig')
  }
}))

router.get('/about', sitepage({
  title: 'About this site',
  mainbody: 'This is a site!'
}))

router.get('/', async (req, res) => {
  if (!req.query.dataset) req.query.dataset = 'demo-1'
  return datasetpage(req, res)
})

router.get('/_list/', async (req, res) => {
  const buf = []
  buf.push(H`<p>Datasets:</p><ol>`)
  for (const [key] of req.siteconfig.datasets) {
    buf.push(H`<li><a href="./${key}">${key}</a></li>`)
  }
  buf.push(H`</ol>`)
  res.send(buf.join('\n'))
})

router.get('/:dataset', async (req, res) => {
  res.redirect('/' + req.params.dataset + '/quads')
})

// allow users to provide the suffix instead of doing con-neg
router.get('/:dataset/:shape.:format', (req, res) => {
  if (['html', ''].includes(req.params.format)) {
    req.params.return = 'html'
  } else {
    req.params.return = 'raw'
  }
  return datasetpage(req, res)
})

// but also support conneg, thanks
router.get('/:dataset/:shape', async (req, res) => {
  if (!req.siteconfig.datasets.get(req.params.dataset)) {
    debug('404', req.url)
    res.status(404).send('' + H`No such dataset, "${req.params.dataset}"`)
    return
  }
  function html (req, res) { return datasetpage(req, res) }
  res.format({
    html,
    json: (req, res) => { req.params.format = 'json'; return datasetpage(req, res) },
    'application/json+ld': (req, res) => {
      req.params.type = 'application/json+ld'
      req.params.format = 'json'
      return datasetpage(req, res)
    },
    default: html
  })
})

module.exports = router
