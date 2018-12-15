const Processor = require('../processor');
const MHTMLParser = require('./mhtmlParser'); // old code
const fs = require('fs').promises;
const filenamify = require('filenamify');

async function markP30(fn, name, file) {
  global.gc();
  let start = Date.now();
  await Promise.all(Array(30).fill().map(() => fn(file)));
  const used = process.memoryUsage().heapUsed / 1024 / 1024;

  console.log(`Converted ${name} in p=30.`,
    'Memory(' + used + ')', 
    ' Average time: ' + (Date.now() - start) / 30
  );
}
async function mark(fn, name, file, iterations = 100) {
  global.gc();
  let start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await fn(file);
  }
  const used = process.memoryUsage().heapUsed / 1024 / 1024;

  console.log(`Converted ${name} ${iterations} times.`,
    'Memory(' + used +")",
    'Average time: ' +     (Date.now() - start) / iterations
  );
}

/* eslint-disable */
(async () => {
  // const newParser = mark.bind(null, Processor.convert);
  const newParserParallel10 = markP30.bind(null, Processor.convert);

  await bench("The New Parser", newParser);
  // await bench("New Parser Parallel 30", newParserParallel10);

  // const oldParserParallel10 = markP30.bind(null, convertOld);
  // const oldParser = mark.bind(null, convertOld);
  
  // await bench("The Old Parser", oldParser);
  await bench("Old Parser Parallel 30", oldParserParallel10);
})();

async function bench(name, parser) {
  console.log(name);  
  // await parser("Example.com", "./demos/example.com.mhtml", 1000)
  // await parser("Nested Iframe", "./demos/nested-iframe.mhtml", 100);
  // await parser("github", "./demos/one.mhtml", 20);
  // await parser("mdn", "./demos/two.mhtml", 20);
  // await parser("ynet", "./demos/ynet.mhtml", 20);
  // await parser("wordpress", "./demos/wordpress.mhtml", 20);
  await parser("GitHub Big", "./demos/github-big.mhtml", 100);
}

async function convertOld(fileName) {    
  const contents = await fs.readFile(fileName)
  const mhtmlParser = new MHTMLParser(contents.toString(), fileName);
  let spitFiles = await mhtmlParser.getHTMLText();
  await Promise.all(spitFiles.map(({ fileName, data }) => {
    if (fileName.endsWith('.html')) {
      fileName = `${fileName}.html`; // so that http-server serves stuff
    }
    return fs.writeFile(`./out/${filenamify(fileName)}`, data);
  }));
}
