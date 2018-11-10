const test = require('tape')
const AppMgr = require('./appmgr')
const debug = require('debug')('test-appmgr')
const fetch = require('make-fetch-happen').defaults({ agent: false })

function sleep (millis) {
  return new Promise(resolve => setTimeout(resolve, millis))
}

test('start & sync stop', async (t) => {
  const appmgr = new AppMgr()
  await appmgr.start()
  debug(`Appmgr started at ${appmgr.siteurl}`)
  debug('stopping')
  await appmgr.stop()
  debug('stopped')
  t.pass()
  t.end()
})

test('second start & sync stop', async (t) => {
  const appmgr = new AppMgr()
  await appmgr.start()
  debug(`Appmgr started at ${appmgr.siteurl}`)
  debug('stopping')
  await appmgr.stop()
  debug('stopped')
  t.pass()
  t.end()
})

test('start & 100ms stop', async (t) => {
  const appmgr = new AppMgr()
  await appmgr.start()
  debug(`Appmgr started at ${appmgr.siteurl}`)
  sleep(100)
  debug('stopping')
  await appmgr.stop()
  debug('stopped')
  t.pass()
  t.end()
})

test('get static', async (t) => {
  const appmgr = new AppMgr({ port: 0 })
  await appmgr.start()
  const res = await fetch(appmgr.siteurl + '/static/hello.txt')
  const text = await res.text()
  t.equal(text, 'hello\n')
  // debug('read text: %j', text)
  debug('stopping')
  await appmgr.stop() // this takes a while if we have an agent-pool
  t.end()
  debug('test ended')
})
