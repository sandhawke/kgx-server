const test = require('tape')
const server = require('./server')
const debug = require('debug')('test-server')

test('start & sync stop', t => {
  const conf = {}
  server.create(conf).then(() => {
    debug(`Server started at ${conf.prefix}`)
    debug('stopping')
    conf.server.close(() => {
      debug('stopped')
      t.pass()
      t.end()
    })
  })
  debug('server.create returned')
})

test('second start & sync stop', t => {
  const conf = {}
  server.create(conf).then(() => {
    debug(`Server started at ${conf.prefix}`)
    debug('stopping')
    conf.server.close(() => {
      debug('stopped')
      t.pass()
      t.end()
    })
  })
  debug('server.create returned')
})

test('start & 100ms stop', t => {
  const conf = {}
  server.create(conf).then(() => {
    debug(`Server started at ${conf.prefix}`)
    setTimeout(() => {
      debug('stopping')
      conf.server.close(() => {
        debug('stopped')
        t.pass()
        t.end()
      })
    }, 100)
  })
  debug('server.create returned')
})
