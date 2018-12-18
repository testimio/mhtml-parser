This package parses MHTML files into multiple HTML files.

It aims to handle url resolution edge cases. It features a hand-written HTML parser that doesn't keep the tree or context which is roughly 10 times faster than running mhtmlparser2 (and about 15 times faster than running parse5).

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
Converted Example.com 1000 times. Memory(18.600929260253906) Average time: 0.494
Converted github 100 times. Memory(12.999603271484375) Average time: 21.1
Converted github large 10 times. Memory(13.364990234375) Average time: 73.1
Converted github unhandled rejection 10 times. Memory(13.101722717285156) Average time: 50.5
Converted mdn 20 times. Memory(16.388351440429688) Average time: 10.65
Converted wikipedia 20 times. Memory(15.015296936035156) Average time: 9.4
Converted hn 20 times. Memory(14.008590698242188) Average time: 1.55
Converted aliexpress 10 times. Memory(24.107528686523438) Average time: 297.2
Converted stackoverflow 10 times. Memory(12.956695556640625) Average time: 42.7
Parser Parallel 30
Converted Example.com in p=30. Memory(12.03277587890625)  Average time: 0.3
Converted github in p=30. Memory(40.22245788574219)  Average time: 19.566666666666666
Converted github large in p=30. Memory(24.891983032226562)  Average time: 56.5
Converted github unhandled rejection in p=30. Memory(42.90928649902344)  Average time: 39.86666666666667
Converted mdn in p=30. Memory(34.61607360839844)  Average time: 7.9
Converted wikipedia in p=30. Memory(25.89984893798828)  Average time: 6.033333333333333
Converted hn in p=30. Memory(15.358741760253906)  Average time: 0.7666666666666667
Converted aliexpress in p=30. Memory(46.56867218017578)  Average time: 139.9
Converted stackoverflow in p=30. Memory(60.3638916015625)  Average time: 25.9
```
