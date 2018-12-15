const fs = require('fs');
const path = require('path');
const Parser = require('./parser');

const promised = (fn, ...args) => new Promise(function executor(resolve, reject) {
  fn.call(this, ...args, (err, data) => {
    if (err) {
      return reject(err);
    }
    return resolve(data);
  });
});
module.exports = class Processor {
  static convert(inputFileName) {
    const parser = new Parser({});
    const fp = promised(fs.readFile, inputFileName);
    return fp.then(data => parser.parse(data).rewrite().spit())
      .then(spitFiles => Promise.all(spitFiles.map(({ filename, content }) => {
        if (path.extname(filename) === '' || path.extname(filename).length > 10) {
          filename = `${filename}.html`; // so that http-server serves stuff
        }
        return promised(fs.writeFile, `./out/${filename}`, content);
      })));
  }
};