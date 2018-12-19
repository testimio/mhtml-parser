This package parses MHTML files into multiple HTML files.

It aims to handle url resolution edge cases. It features a hand-written HTML parser that doesn't keep the tree or context which is roughly 10 times faster than running htmlparser2 (and about 15 times faster than running parse5).

It rewrites local URLS so that links inside the page keep working.

It supports a parser class that lets you view the files and a convenient `npm run serve` for serving files locally which expects
files to be in the demos directory (for example, try opening `http://localhost:8080/hn.mhtml`).

## Installation

```
npm i fast-mhtml
```

## MHTML Parser

Parses MHTML files.

```js
const { Parser } = require("fast-mhtml");
const p = new Parser({
  rewriteFn: filenamify, // default, urls are rewritten with this function
});
const result = p.parse(mhtmlFileContents) // parse file
 .rewrite() // rewrite all links
 .spit(); // return all contents

// result is an array of { contents: string, filename: string }
```

## API

### Processor

The processor provices a convenience method for converting a .mhtml file to multiple files.

It provides a single convert static method

```js
const { Processor } = require("fast-mhtml");
Processor.convert("one.mhtml"); // returns a promise that fulfills when the conversion is done
```

### `new Parser([config])`

Creates a new mhtml parser with the given rewriteFn mhtml file contents. Example:

```js
const { Parser } = require("fast-mhtml");
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

### `Parser.prototype.rerwite()`

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

## Benchmarks

Run with `npm run benchmark`:

```
Parser Serial
Converted Example.com 1000 times. Memory(18.826828002929688) Average time: 0.56
Converted github 100 times. Memory(12.074104309082031) Average time: 19.14
Converted github large 10 times. Memory(12.456100463867188) Average time: 83
Converted github unhandled rejection 10 times. Memory(12.049331665039062) Average time: 52.9
Converted mdn 20 times. Memory(17.96161651611328) Average time: 12.05
Converted wikipedia 20 times. Memory(17.274307250976562) Average time: 11.2
Converted hn 20 times. Memory(13.093658447265625) Average time: 2.2
Converted aliexpress 10 times. Memory(15.335090637207031) Average time: 351.6
Converted stackoverflow 10 times. Memory(11.950820922851562) Average time: 38.7
Parser Parallel 30
Converted Example.com in p=30. Memory(11.032470703125)  Average time: 0.4
Converted github in p=30. Memory(59.808494567871094)  Average time: 15.433333333333334
Converted github large in p=30. Memory(47.719322204589844)  Average time: 55.333333333333336
Converted github unhandled rejection in p=30. Memory(54.20075988769531)  Average time: 36.766666666666666
Converted mdn in p=30. Memory(33.22865295410156)  Average time: 8.566666666666666
Converted wikipedia in p=30. Memory(19.14885711669922)  Average time: 7
Converted hn in p=30. Memory(14.386123657226562)  Average time: 1.0666666666666667
Converted aliexpress in p=30. Memory(35.472434997558594)  Average time: 183.16666666666666
Converted stackoverflow in p=30. Memory(27.071426391601562)  Average time: 26.333333333333332
```
