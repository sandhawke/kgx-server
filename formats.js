const CSV = require('csv-string')

const formats = {}
module.exports = formats

formats.csv = {
  name: 'csv',
  stringifier: CSV.stringify
}

formats.json = {
  name: 'json',
  stringifier: x => JSON.stringify(x, null, 2)
}

formats.table = {
  name: 'stable'
}
