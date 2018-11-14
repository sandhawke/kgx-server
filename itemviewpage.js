const H = require('escape-html-template-tag')
// const debug = require('debug')('itemviewpage')
const sitepage = require('./sitepage')
const shapes = require('./shapes')
const formats = require('./formats')

module.exports = (req, res) => {
  const p = Object.assign({}, req.params, req.query)

  // which dataset?  maybe all of them, as provenance
  //
  // different datasets might say different things about it.
  //
  if (!p.dataset) {
    res.status(400).send('Missing dataset parameter')
    return
  }
  const kb = req.appmgr.datasets.get(p.dataset)

  if (!p.url) {
    res.status(400).send('Missing url parameter')
    return
  }
  const item = kb.named(p.url) // or blank node labels?

  // maybe make these tabs?
  const asSubject = kb.getQuads(item, null, null, null)
  const asPredicate = kb.getQuads(null, item, null, null)
  const asObject = kb.getQuads(null, null, item, null)
  const asGraph = kb.getQuads(null, null, null, item)

  // quick hack to view the data, for now...
  const all = asSubject.concat(asPredicate).concat(asObject).concat(asGraph)

  const data = shapes.quad.fromRDF(all)
  const nodestr = formats.table.makeNodeStr(kb, x => req.stateURL({ url: x }))
  const stringified = formats.table.stringifier(data, nodestr)

  const config = {
    title: 'itemview',
    h1: H`In <a href="${req.stateURL({ url: undefined })}">${p.dataset}</a>, quads using: &lt;${p.url}&gt;:`,
    // nav,
    mainbody: H`<div class="databox">${stringified}</div>`
  }
  sitepage(config)(req, res)
}
