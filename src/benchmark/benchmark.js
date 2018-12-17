const filenamify = require('filenamify');
const co = require('bluebird').coroutine;
const { promisifyAll } = require('bluebird');
const fs = promisifyAll(require('fs'));
const MHTMLParser = require('./mhtmlParser'); // old code
const Processor = require('../processor');

/* eslint-disable */
const markP30 = co(function * markP30(fn, name, file) {
  global.gc();
  const start = Date.now();
  yield Promise.all(Array(30).fill().map(() => fn(file)));
  const used = process.memoryUsage().heapUsed / 1024 / 1024;

  console.log(`Converted ${name} in p=30.`,
    `Memory(${used})`,
    ` Average time: ${(Date.now() - start) / 30}`);
});

const mark = co(function *(fn, name, file, iterations = 100) {
  global.gc();
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    yield fn(file);
  }
  const used = process.memoryUsage().heapUsed / 1024 / 1024;

  console.log(`Converted ${name} ${iterations} times.`,
    `Memory(${used})`,
    `Average time: ${(Date.now() - start) / iterations}`);
});


const bench = co(function *(name, parser) {
  console.log(name);  
  yield parser("Example.com", "./demos/example.com.mhtml", 1000)
  yield parser("Nested Iframe", "./demos/nested-iframe.mhtml", 100);
  yield parser("github", "./demos/one.mhtml", 100);
  yield parser("mdn", "./demos/two.mhtml", 20);
  yield parser("ynet", "./demos/ynet.mhtml", 20);
  yield parser("wordpress", "./demos/wordpress.mhtml", 20);
  yield parser("GitHub Big", "./demos/github-big.mhtml", 10);
});

const convertOld = co(function* (fileName) {    
  const contents = yield fs.readFileAsync(fileName)
  const mhtmlParser = new MHTMLParser(contents.toString(), fileName);
  let spitFiles = yield mhtmlParser.getHTMLText();
  yield Promise.all(spitFiles.map(({ fileName, data }) => {
    if (fileName.endsWith('.html')) {
      fileName = `${fileName}.html`; // so that http-server serves stuff
    }
    return fs.writeFileAsync(`./out/${filenamify(fileName)}`, data);
  }));
});

/* eslint-disable */
co(function *() {
  const newParser = mark.bind(null, Processor.convert);
  const newParserParallel10 = markP30.bind(null, Processor.convert);

  yield bench("The New Parser", newParser);
  yield bench("New Parser Parallel 30", newParserParallel10);

  const oldParserParallel10 = markP30.bind(null, convertOld);
  const oldParser = mark.bind(null, convertOld);
  
  yield bench("The Old Parser", oldParser);
  yield bench("Old Parser Parallel 30", oldParserParallel10);
})();

