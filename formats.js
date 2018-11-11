const CSV = require('csv-string')

const formats = []
module.exports = formats

formats.push({
  name: 'table',
  applicable: () => true
})

formats.push({
  name: 'json',
  stringifier: x => JSON.stringify(x, null, 2),
  type: 'application/json',
  applicable: () => true
})

formats.push({
  name: 'csv',
  stringifier: rows => {
    return CSV.stringify([rows.columnLabels].concat(rows))
  },
  type: 'text/csv',
  applicable: x => x.isRows
})

formats.push({
  name: 'turtle',
  stringifier: x => 'turtle goes here',
  type: 'text/turtle',
  applicable: x => x.isRDF
})


// Make formats addressible by name as well as number.  Sketchy, I know.
for (const format of formats) {
  formats[format.name] = format
}
