## MHTML Parser

Parses MHTML files.

```js
const { Parser } = require("./src/index");
const p = new Parser({
  rewriteFn: filenamify, // default, urls are rewritten with this function
});
const result = p.parse(mhtmlFileContents) // parse file
 .rewrite() // rewrite all links
 .spit(); // return all contents

// result is an array of { contents: string, filename: string }
```

## API

### `new Parser([config])`

Creates a new mhtml parser with the given rewriteFn mhtml file contents. Example:

```js
const { Parser } = require("./src/index.js");
const parser = new Parser({ }); // default
const parser2 = new Parser({ 
  rewriteFn(url) { return url.replace(/\//g, '_'); } // replace /s with _s
});
const links = [];
const parser3 = new Parser({ // saves all links when rewrite is called
  rewriteFn(url) { links.push(url); return url; }
});
```

### `Parser.prototype.parse(data: Buffer | string)`

Parses the given file with the mhtml parser. Expects the string or buffer contents of an `.mhtml` file produced by Google Chrome.

```js
let data = await fs.readFile('./demos/nested-iframe.mhtml')
const parser = new Parser({ }); // default
parser.parse(data);
parser.spit(); // gets parsed data as array of {filename, contents}
```

### `Parser.prototype.rerwite()

Rewrites all links in the given mhtml file to refer to the other files and passes them through the parser's `rewriteFn` (filenamify by default).

This is used so that links in the parsed mhtml file refer to the same file. 

Note that in typical usage `rewriteFn` will translate how a link's URL will be saved on your server or locally.

**Note:** Assumes `Parser.prototype.parse` was called. Throws an error otherwise

```js
let data = await fs.readFile('./demos/nested-iframe.mhtml')
parser.parse(data);
parser.rewrite(); // converts all internal links to web pages to internal links based on the other mhtml resources
parser.spit(); // gets parsed data as array of {filename, contents}
```

