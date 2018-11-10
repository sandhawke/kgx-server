const server = require('./server')

const conf = {}

server.create(conf).then(() => {
  console.log(`Server started at ${conf.prefix}`)
})
console.log('server.create returned', conf)
