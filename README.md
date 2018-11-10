
QuadSite is simple server-side browser for RDF data.  You set it up
with some RDF datasets (triples and/or quads), and it lets users poke
at them a little.  The main goal is to make medium-complexity RDF
datasets be easily used by coders without knowing about RDF.

Status: Very new and untested.  So far only used for credibility
data. The plan is to make it flexible about handling all sorts of
shapes/schemas, someday, maybe.

Some possible features someday:

 * Dynamic loading of sites from a URL, maybe making them public if
   they have a CC license
 * Graph viewer
 * Tree viewer (like tabulator)
 * Let the data point us to new shapes and formats
 * Social features (but those should probably be in the data)
 * Edit, with write back, if you have access
 * Fast-update sync, maybe using websub, esp between two instalations
 * Use a SPARQL engine for more scaling of the data
 * Operations across datasets, probably using quad-nesting
 