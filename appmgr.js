const express = require('express')
const logger = require('morgan')
const kgx = require('kgx')
const debug = require('debug')('appmgr')
const routes = require('./routes')

/*
  Properties / Options:

  port = number, 0 for dynamic, undefined for process.end.PORT or 8080
  siteurl = something like "https://host.com/data", prepended to all self URLs
  datasets = Map of all datasets
  server = becomes the net.Server created, good for .close()
  app = becomes the express app created

*/
class AppMgr {
  constructor (options) {
    const appmgr = this

    /*
    // common bug for me is to forget to call server.start
    if (!this.manualStart) {
      process.nextTick(() => this.start())
    }
    */

    Object.assign(appmgr, options)

    if (!appmgr.datasets) appmgr.datasets = new Map()

    if (appmgr.port === undefined) {
      appmgr.port = process.env.PORT
      if (appmgr.port === undefined) appmgr.port = 8080
      // if it's 0 it'll be changed when the listen completes
    }
    if (!appmgr.siteurl) {
      appmgr.siteurl = process.env.SITEURL
    }


    if (appmgr.app) throw Error('this is only a return value')
    if (appmgr.server) throw Error('this is only a return value')

    kgx.defaultns.cred = 'http://www.w3.org/ns/credweb#'

    const app = express()
    appmgr.app = app

    app.use(logger('dev'))

    app.use('/', (req, res, next) => {
      // let all the handlers know the appmgr
      req.appmgr = appmgr
      next()
    })

    app.use('/', routes)
  }

  stop () {
    return new Promise((resolve, reject) => {
      this.server.close(resolve)
    })
  }

  start () {
    this.load() // just start the loading async
    return new Promise((resolve, reject) => {
      const appmgr = this

      // could move this to after the data is loaded if we want, but
      // eventually we'll be doing dynamic loading, I expect
      appmgr.server = appmgr.app.listen(appmgr.port, arg => {
        appmgr.port = appmgr.server.address().port
        if (!appmgr.siteurl) {
          appmgr.siteurl = `http://localhost:${appmgr.port}`
        }

        debug(`server started`)
        resolve()
      })
    })
  }

  async load () {
    const appmgr = this

    for (const name of ['demo-1', 'demo-2', 'zhang18']) { 
      const kb = kgx.createKB()
      appmgr.datasets.set(name, kb)

      await kb.aload(`${name}.trig`, { baseIRI: appmgr.siteurl + '/' + name + '#' })

      // cute, but ldfetch isn't getting the base right yet   :-(
      // but yeah, this would be good.
      // const url = appmgr.siteurl + '/static/' + name
      // await kb.aload(url)
    }
  }
}

module.exports = AppMgr
