This package parses MHTML files into multiple HTML files.

It aims to handle url resolution edge cases. It features a hand-written HTML parser that doesn't keep the tree or context which is roughly 10 times faster than running htmlparser2 (and about 15 times faster than running parse5).

It rewrites local URLS so that links inside the page keep working.

It supports a parser class that lets you view the files and a convenient `npm run serve` for serving files locally which expects
files to be in the demos directory (for example, try opening `http://localhost:8080/hn.mhtml`).

## Installation

```
npm i fast-mhtml
```

### Optional 64 dependency

If you're running node <= 10, you may run `npm install 64`,
Which, compared to the native base64 conversion, is faster and is simd-based.

On node > 10, `fast-mhtml` will use the native conversion.

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
Converted Example.com 1000 times. Memory(18.68872833251953) Average time: 0.501
Converted github 100 times. Memory(16.769790649414062) Average time: 20.85
Converted github large 10 times. Memory(13.422744750976562) Average time: 82.1
Converted github unhandled rejection 10 times. Memory(13.100151062011719) Average time: 55.7
Converted mdn 20 times. Memory(15.045555114746094) Average time: 11.55
Converted wikipedia 20 times. Memory(15.825851440429688) Average time: 9.95
Converted hn 20 times. Memory(14.122116088867188) Average time: 1.4
Converted aliexpress 10 times. Memory(30.917129516601562) Average time: 246.7
Converted stackoverflow 10 times. Memory(12.987167358398438) Average time: 37.9
Parser Parallel 30
Converted Example.com in p=30. Memory(12.05023193359375)  Average time: 0.36666666666666664
Converted github in p=30. Memory(66.4161376953125)  Average time: 20.366666666666667
Converted github large in p=30. Memory(57.51581573486328)  Average time: 60.03333333333333
Converted github unhandled rejection in p=30. Memory(50.43537902832031)  Average time: 40.03333333333333
Converted mdn in p=30. Memory(28.769508361816406)  Average time: 7.833333333333333
Converted wikipedia in p=30. Memory(17.2572021484375)  Average time: 6.3
Converted hn in p=30. Memory(15.370010375976562)  Average time: 0.8
Converted aliexpress in p=30. Memory(66.49591827392578)  Average time: 109.23333333333333
Converted stackoverflow in p=30. Memory(57.837928771972656)  Average time: 23.533333333333335
```
