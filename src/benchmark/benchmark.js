const co = require('bluebird').coroutine;
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
  yield parser("github", "./demos/github.node.mhtml", 100);
  yield parser("github large", "./demos/github.node.biggest.mhtml", 10);
  yield parser("github unhandled rejection", "./demos/github.unhandledrejection.mhtml", 10);
  yield parser("mdn", "./demos/mdn.mhtml", 20);
  yield parser("wikipedia", "./demos/wikipedia.mhtml", 20);
  yield parser("hn", "./demos/hn.mhtml", 20);
  yield parser("aliexpress", "./demos/aliexpress-scrolled.mhtml", 10);
  yield parser("stackoverflow", "./demos/stackoverflow.mhtml", 10);
});

/* eslint-disable */
co(function *() {
  const newParser = mark.bind(null, Processor.convert);
  const newParserParallel10 = markP30.bind(null, Processor.convert);

  yield bench("Parser Serial", newParser);
  yield bench("Parser Parallel 30", newParserParallel10);
})();

