const Parser = require('./parser');
const fs = require('fs');

module.exports = class Processor {
  static convert(filename) {
    const parser = new Parser({});
    const fp = new Promise((resolve, reject) => fs.readFile(filename, (err, data) => err ? reject(err) : resolve(data)));
    return fp.then(data => parser.parse(data).rewrite().spit())
             .then(spitFiles => Promise.all(spitFiles.map(({filename, content}) => {
               if (filename.endsWith(".html")) {
                 filename = filename + ".html"; // so that http-server serves stuff
               }
               return new Promise((resolve, reject) => fs.writeFile('./out/' + filename, content, (err, data) => err ? reject(err) : resolve(data)))
             })));
  }
}