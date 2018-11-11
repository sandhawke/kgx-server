
// const debug = require('debug')('signal-data-server')
const H = require('escape-html-template-tag') // H.safe( ) if needed

function sitepage (config) {
  return (req, res) => {
    const p = Object.assign({}, req.params, req.query)
    const appmgr = req.appmgr
    const url = req.stateURL

    // Not sure this belongs here either...
    let upperNav
    if (p.framed) {
      upperNav = H`<div style="float: right"><a href="${url()}" target="_blank">New Tab</a></div>`
    } else {
      const buf = []
      for (const [key] of appmgr.datasets) {
        if (buf.length <= 5) {
          buf.push(H`<a href="${url({ dataset: key })}">${key}</a>`)
        } else {
          buf.push(H`<a href="${appmgr.siteurl}/_list"><i>(more)</i></a>`)
          break
        }
      }

      upperNav = H`<ul class="nav" style="margin-bottom: 0.9em; margin-top: -1.2em">
       <li><a href="/">Home</a></li>
       <li>Datasets: ${H.safe(buf.join(' | '))}</li>
       <li><a href="${req.appmgr.siteurl + '/about'}">About</a></li></ul>`
    }
    console.log('siteurl = %j', req.appmgr.siteurl)
    req.stateURL = url

    /*
      For each config value we're going to fill into the template
      turn it into a string.  Be flexible, though -- if it's a
      function, evaluatate it.  If it's an array, join the elements.
      Do all that recursively, so we can have functions returning
      arrays of functions, etc.

      Maybe put this as req.fill so they can call this on their own
      template bits?
    */
    function fill (val) {
      while (typeof val === 'function') {
        val = val(req)
      }
      if (val === undefined || val === null) return ''
      if (typeof val === 'string') return val
      if (Array.isArray(val)) {
        return val.map(fill).join('')
      }
      // not much we can after here, so this is more diagnostic
      if (typeof val === 'object') return val // H.safe, JSON.stringify(val)
      return val.toString()
    }
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css?family=Noto+Sans" rel="stylesheet">
  <link rel="stylesheet" href="${appmgr.siteurl}/static/reset.css">
  <link rel="stylesheet" href="${appmgr.siteurl}/static/main.css">
  <script
			  src="https://code.jquery.com/jquery-3.3.1.slim.min.js"
			  integrity="sha256-3edrmyuQ0w65f8gfBsqowzjJe2iM6n0nKciPUp8y+7E="
			  crossorigin="anonymous"></script>
  <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.19/css/jquery.dataTables.css">
  <script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.js"></script>
  <title>${fill(config.title)}</title>
</head>
<body>
  <div class="header">
    ${fill(upperNav)}
    <h2>${fill(config.h1 || config.title)}</h2>
    ${fill(config.nav)}</div>
  ${fill(config.mainbody)}</body></html>
`)
  }
}

module.exports = sitepage
