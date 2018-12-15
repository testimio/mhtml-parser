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

### Processor

The processor provices a convenience method for converting a .mhtml file to multiple files. 

It provides a single convert static method

```js
const { Processor } = require("./src/index");
Processor.convert("one.mhtml"); // returns a promise that fulfills when the conversion is done
```

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

## Benchmarks

```
The New Parser
(node:75852) ExperimentalWarning: The fs.promises API is experimental
Converted Example.com 1000 times. Memory(13.235984802246094) Average time: 0.326
Converted Nested Iframe 100 times. Memory(13.787017822265625) Average time: 0.58
Converted github 20 times. Memory(32.53540802001953) Average time: 63.75
Converted mdn 20 times. Memory(19.080490112304688) Average time: 20.25
Converted ynet 20 times. Memory(22.51367950439453) Average time: 61.55
Converted wordpress 20 times. Memory(30.61791229248047) Average time: 83.75
Converted GitHub Big 10 times. Memory(24.162643432617188) Average time: 259.3
New Parser Parallel 30
Converted Example.com in p=30. Memory(9.875274658203125)  Average time: 0.13333333333333333
Converted Nested Iframe in p=30. Memory(10.8001708984375)  Average time: 0.3
Converted github in p=30. Memory(44.532371520996094)  Average time: 67.53333333333333
Converted mdn in p=30. Memory(55.415855407714844)  Average time: 20.666666666666668
Converted ynet in p=30. Memory(62.74353790283203)  Average time: 38.86666666666667
Converted wordpress in p=30. Memory(84.79685974121094)  Average time: 71.4
Converted GitHub Big in p=30. Memory(79.45358276367188)  Average time: 213.7
The Old Parser
Converted Example.com 1000 times. Memory(14.17755126953125) Average time: 0.404
Converted Nested Iframe 100 times. Memory(18.85687255859375) Average time: 0.61
Converted github 20 times. Memory(14.019859313964844) Average time: 500.7
Converted mdn 20 times. Memory(18.442649841308594) Average time: 24
Converted ynet 20 times. Memory(16.299087524414062) Average time: 157.25
Converted wordpress 20 times. Memory(44.43395233154297) Average time: 306.85
Converted GitHub Big 10 times. Memory(41.44257354736328) Average time: 15867.4
Old Parser Parallel 30
Converted Example.com in p=30. Memory(11.499809265136719)  Average time: 0.8
Converted Nested Iframe in p=30. Memory(12.569595336914062)  Average time: 0.4666666666666667
Converted github in p=30. Memory(156.99202728271484)  Average time: 466.7
Converted mdn in p=30. Memory(46.24675750732422)  Average time: 22.766666666666666
Converted ynet in p=30. Memory(196.69261932373047)  Average time: 135.1
Converted wordpress in p=30. Memory(183.77699279785156)  Average time: 269.4
Converted GitHub Big in p=30. Memory(935.9068832397461)  Average time: 15939.9
```
