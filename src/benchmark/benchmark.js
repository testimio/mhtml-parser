/* eslint-disable no-await-in-loop, no-console */
const { mkdirSync } = require('fs');
const { resolve } = require('path');
const Processor = require('../processor');

/**
 * Should create out dir for all the out files.
 */
try {
  mkdirSync(resolve(__dirname, '../../out'));
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error(`Unable to perform benchmark because of error ${err.message}`);
    process.exit(1);
  }
}

async function markP30(fn, name, file) {
  global.gc();
  const start = Date.now();
  await Promise.all(Array(30).fill().map(() => fn(file)));
  const used = process.memoryUsage().heapUsed / 1024 / 1024;

  console.log(
    `Converted ${name} in p=30.`,
    `Memory(${used})`,
    ` Average time: ${(Date.now() - start) / 30}`
  );
}

async function mark(fn, name, file, iterations = 1000) {
  global.gc();
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await fn(file);
  }
  const used = process.memoryUsage().heapUsed / 1024 / 1024;

  console.log(
    `Converted ${name} ${iterations} times.`,
    `Memory(${used})`,
    `Average time: ${(Date.now() - start) / iterations}`
  );
}

async function bench(name, parser) {
  console.log(name);
  await parser('Example.com', './demos/example.com.mhtml', 1000);
  await parser('github', './demos/github.node.mhtml', 100);
  await parser('github large', './demos/github.node.biggest.mhtml', 10);
  await parser('github unhandled rejection', './demos/github.unhandledrejection.mhtml', 10);
  await parser('mdn', './demos/mdn.mhtml', 20);
  await parser('wikipedia', './demos/wikipedia.mhtml', 20);
  await parser('hn', './demos/hn.mhtml', 20);
  await parser('aliexpress', './demos/aliexpress-scrolled.mhtml', 10);
  await parser('stackoverflow', './demos/stackoverflow.mhtml', 10);
}

async function run() {
  const newParser = mark.bind(null, Processor.convert);
  const newParserParallel10 = markP30.bind(null, Processor.convert);

  await bench('Parser Serial', newParser);
  await bench('Parser Parallel 30', newParserParallel10);
}

run();
