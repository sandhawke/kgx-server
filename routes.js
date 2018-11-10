const express = require('express')
const debug = require('debug')('routes')
const H = require('escape-html-template-tag') // H.safe( ) if needed
const querystring = require('querystring')

const router = express.Router()

/*
  Add a req.stateURL function which gives back a URL to this site
  with some altered state, as given by the parms, which is an overlay
  to our state in req.p

  This needs to know all the routes, which is why it's here.
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

module.exports = router
