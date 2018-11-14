const CSV = require('csv-string')
const H = require('escape-html-template-tag')
const N3 = require('n3')
const kgx = require('kgx')

const formats = []
module.exports = formats

// stringifier (data, { kb, urlState, ... })

formats.push({
  name: 'table',
  makeNodeStr: (kb, urlFunc) => {
    return v => {
      if (!v) return v
      if (v.termType === 'Literal' &&
          (v.datatype.value === 'http://www.w3.org/2001/XMLSchema#date' ||
              v.datatype.value === 'http://www.w3.org/2001/XMLSchema#dateTimeStamp')) {
        return (new Date(v.value)).toISOString()
      }

      if (v.termType === 'NamedNode') {
        let label = '...' + v.value.slice(-16)
        // need URL function, so this function need to be passed it!
        return H`<a href="${urlFunc(v.value)}">${label}</a>`
      }
      return v.value
    }
  },
  stringifier: (data, nodestr = x => x) => {
    const out = []
    out.push('<table id="datatable" class="display">')
    out.push('  <thead>')
    out.push('    <tr>')
    for (const label of data.columnLabels) {
      out.push(H`      <th>${label}</th>`)
    }
    out.push('    </tr>')
    out.push('  </thead>')
    out.push('  <tbody>')
    for (const row of data) {
      out.push('    <tr>')
      for (const col of row) {
        out.push(H`      <td>${nodestr(col)}</td>`)
      }
      out.push('    </tr>')
    }
    out.push('  </tbody>')
    out.push('</table>')
    out.push(H.safe`
<script>
$(document).ready( function () {
    $('#datatable').DataTable();
})
</script>
`)
    return H.safe(out.join('\n'))
  },
  applicable: x => x.isRows
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
  stringifier: data => {
    // this should be exposed from kgx -- but at the moment we don't
    // have kb!    Get it from req?
    let out = 'n3 async error'
    const writer = N3.Writer({ format: 'trig', prefixes: kgx.defaultns })
    for (const q of data) writer.addQuad(q)
    writer.end((error, result) => { if (error) throw error; out = result })
    return out
  },
  type: 'text/turtle',
  applicable: x => x.isRDF
})

// Make formats addressible by name as well as number.  Sketchy, I know.
for (const format of formats) {
  formats[format.name] = format
}
