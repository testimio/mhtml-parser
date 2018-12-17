const fs = require('fs');
const path = require('path');
const express = require('express');
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
      .then(spitFiles => Promise.all(spitFiles.map(({ filename, content }, index) => {
        let r = Promise.resolve();
        if (index === 0 && path.extname(filename) !== '.html') {
          r = r.then(() => promised(fs.writeFile, `./out/${filename}.html`, content));
        }
        return r.then(() => promised(fs.writeFile, `./out/${filename}`, content));
      })));
  }

  static serve(port = 8080) {
    const app = express();
    const fileCache = new Map();
    app.get('/:path', (req, res) => {
      const file = req.params.path;
      if (file.endsWith('mhtml')) { // main file
        fileCache.clear(); // empty cache
        const parser = new Parser({ });
        const fp = promised(fs.readFile, `./demos/${file}`);
        fp.then(data => parser.parse(data).rewrite().spit()).then((spitFiles) => {
          for (const result of spitFiles) {
            fileCache.set(result.filename.replace(/#.*/, ''), result); // remove hash and set in cache
          }
          res.setHeader('Content-Type', spitFiles[0].type);
          res.send(spitFiles[0].content);
          res.end();
        }).catch((err) => {
          res.status(500);
          res.send(`Error: ${err}<br />${err.stack.replace(/\n/, '<br />')}`);
          res.end();
        });
        return;
      }
      const result = fileCache.get(file);
      if (!result) {
        res.status(404);
        res.send(`MISS ${file} FROM${JSON.stringify(fileCache.keys())}`);
        res.end();
        return;
      }
      res.setHeader('Content-Type', result.type);
      res.send(result.content);
      res.end();
    });
    app.listen(port);
  }
};
