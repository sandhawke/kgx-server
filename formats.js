const CSV = require('csv-string')

// needs a stable order
// maybe make it both array and object?   formats[0] === formats.csv ?

const formats = {}
module.exports = formats

formats.csv = {
  name: 'csv',
  stringifier: CSV.stringify,
  type: 'text/csv',
  applicable: x => x.isRows
}

formats.json = {
  name: 'json',
  stringifier: x => JSON.stringify(x, null, 2),
  type: 'application/json',
  applicable: () => true
}

formats.turtle = {
  name: 'turtle',
  stringifier: x => 'turtle goes here',
  type: 'text/turtle',
  applicable: x => x.isRDF
}

formats.table = {
  name: 'table'
}
