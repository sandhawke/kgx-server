/*
  Kind of an odd mix of general stuff for any website and specific
  stuff for this site.
*/
const querystring = require('querystring')
const debug = require('debug')('signal-data-server')
const H = require('escape-html-template-tag') // H.safe( ) if needed

// module is a function you need to apply to the siteconfig to get the
// sitepage function to use

module.exports = (siteconfig) => {
  return function sitepage (config) {
    return (req, res) => {
      const p = Object.assign({}, req.params, req.query)

      // THIS function should maybe be with the routes?
      function url (pChanges) {
        const pp = Object.assign({}, p, pChanges)
        debug('url for', p, pChanges)
        let path = ''
        // pull out dataset, shape, format, and return
        if (pp.dataset && pp.shape && pp.format) {
          if (pp.return === 'raw') {
            path = H`${pp.dataset}/${pp.shape}.${pp.format}`
            delete pp.format
          } else {
            path = H`${pp.dataset}/${pp.shape}`
          }
          delete pp.dataset
          delete pp.shape
          delete pp.return
        }
        let q = '?' + querystring.stringify(pp)
        if (q === '?') q = ''
        const u = H.safe(siteconfig.prefix + '/' + path + q)
        debug('url constructed', u)
        return u
      }

      // Not sure this belongs here either...
      let upperNav
      if (p.framed) {
        upperNav = H`<div style="float: right"><a href="${url()}" target="_blank">New Tab</a></div>`
      } else {
        const buf = []
        for (const [key] of siteconfig.datasets) {
          if (buf.length <= 5) {
            buf.push(H`<a href="${url({ dataset: key })}">${key}</a>`)
          } else {
            buf.push(H`<a href="${siteconfig.prefix}/_list"><i>(more)</i></a>`)
            break
          }
        }

        upperNav = H`<ul class="nav" style="margin-bottom: 0.9em; margin-top: -1.2em">
       <li><a href="/">Home</a></li>
       <li>Datasets: ${H.safe(buf.join(' | '))}</li>
       <li><a href="about">About</a></li></ul>`
      }
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
        if (val === 'undefined' || val === 'null') return ''
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
  <link rel="stylesheet" href="${siteconfig.prefix}/static/reset.css">
  <link rel="stylesheet" href="${siteconfig.prefix}/static/main.css">
  <title>${fill(config.title)}</title>
</head>
<body>
  <div class="header">
    ${fill(upperNav)}
    <h2>${fill(config.h1)}</h2>
    ${fill(config.nav)}</div>
  ${fill(config.mainbody)}</body></html>
`)
    }
  }
}
