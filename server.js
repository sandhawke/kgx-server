/*
  RENAME to appmgr, make class AppMgr

  ADD rel=licence stuff, about dataset

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
const logger = require('morgan')
// const H = require('escape-html-template-tag') // H.safe( ) if needed
const debug = require('debug')('signal-data-server')
const routes = require('./routes')

/*
  siteconfig is a read/write object.  Caller sets it up with some
  stuff, but we change it inways the caller may want to know about.

  maybe convert this into a class MyAppServer (AppController?  appctl?
  Site?) with these properties, and make start() be async

  siteconfig = {
  port = number, 0 for dynamic, undefined for process.end.PORT or 8080
  prefix = something like "https://host.com/data", prepended to all self URLs
  datasets = Map of all datasets
  server = becomes the net.Server created, good for .close()
  app = becomes the express app created
  }

  resolves when server is listening, for easier testing.
*/
function create (siteconfig) {
  return new Promise((resolve, reject) => {
    if (!siteconfig.datasets) siteconfig.datasets = new Map()
    if (siteconfig.port === undefined) {
      siteconfig.port = process.env.PORT
      if (siteconfig.port === undefined) siteconfig.port = 8080
    }
    if (!siteconfig.prefix) {
      siteconfig.prefix = `http://localhost:${siteconfig.port}`
    }

    if (siteconfig.app) throw Error('this is only a return value')
    if (siteconfig.server) throw Error('this is only a return value')

    rdfkb.defaultns.cred = 'http://www.w3.org/ns/credweb#'

    const app = express()
    siteconfig.app = app

    async function start () {
      // could move this to after the data is loaded if we want, but
      // eventually we'll be doing dynamic loading, I expect
      siteconfig.server = app.listen(siteconfig.port, arg => {
        debug(`server started`)
        resolve(arg)
      })

      for (const name of ['demo-1', 'demo-2']) { // 'zhang18'
        const kb = rdfkb.create()
        siteconfig.datasets.set(name, kb)

        await kb.aload(`${name}.trig`, { baseIRI: siteconfig.prefix + '/static/' + name })

        // cute, but ldfetch isn't getting the base right yet   :-(
        // but yeah, this would be good.
        // const url = siteconfig.prefix + '/static/' + name
        // await kb.aload(url)
      }
    }

    app.use(logger('dev'))

    app.use('/', (req, res, next) => {
      // let all the handlers know the siteconfig
      req.siteconfig = siteconfig
      next()
    })

    app.use('/', routes)

    start()
  })
}

module.exports.create = create
