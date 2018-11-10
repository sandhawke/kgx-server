const server = require('./server')

const conf = {}

server.create(conf).then(() => {
  console.log(`Server listening at ${conf.prefix}`)
})
