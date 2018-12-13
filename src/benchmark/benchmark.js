const Processor = require('../processor');
const MHTMLParser = require('./mhtmlParser'); // old code
const fs = require('fs').promises;
const filenamify = require('filenamify');

async function mark(fn, name, file, iterations = 100) {
  let start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await fn(file);
  }
  console.log(`Converted ${name} ${iterations} times. Average time: `, (Date.now() - start) / iterations);
}
/* eslint-disable */
(async () => {
  let start = Date.now();
  const newParser = mark.bind(null, Processor.convert);
  await bench("The New Parser", newParser);
  const oldParser = mark.bind(null, convertOld);
  await bench("The Old Parser", oldParser);
})();

async function bench(name, parser) {
  console.log("The New Parser");  
  await parser("Example.com", "./demos/example.com.mhtml")
  await parser("Nested Iframe", "./demos/nested-iframe.mhtml");
  await parser("github", "./demos/one.mhtml", 10);
  await parser("mdn", "./demos/two.mhtml", 10);
  await parser("ynet", "./demos/ynet.mhtml", 10);
  await parser("wordpress", "./demos/wordpress.mhtml", 10);
  await parser("GitHub Big", "./demos/github-big.mhtml", 10);
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
