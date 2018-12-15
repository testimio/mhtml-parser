const cheerio = require('cheerio');
const csstree = require('css-tree');
const { URL } = require('url');
const Generator = require('./dom-link-renamer');

let generator;

module.exports = {
  html(domBuffer, resourcesMap, baseUrl) {
    const gotString = typeof domBuffer === 'string';
    if (gotString) {
      domBuffer = Buffer.from(domBuffer);
    }
    if (generator) {
      generator.reset(domBuffer, resourcesMap, baseUrl);
    } else {
      generator = new Generator(domBuffer, resourcesMap, baseUrl); // TODO baseUrl + URL resolving
    }
    generator.parse();
    if (gotString) {
      return generator.result().toString();
    }
    return generator.result().slice();
  },
  svg(svgString, resourcesMap, baseUrl) {
    const $ = cheerio.load(svgString, { xmlMode: true });
    $('[href],[xlink\\:href]').each((i, el) => {
      el = $(el);
      const link = new URL(el.attr('href') || el.attr('xlink:href'), baseUrl).toString();
      const mapped = resourcesMap.get(link) || link;
      el.removeAttr('xlink:href');
      el.attr('href', mapped);
    });
    return $.html();
  },
  css(cssString, resourcesMap, baseUrl) {
    const ast = csstree.parse(cssString, { parseRulePrelude: false });
    csstree.walk(ast, function walker(node) {
      if (this.declaration === null || node.type !== 'Url') {
        return;
      }
      const { value } = node;
      if (value.type === 'Raw') {
        const link = new URL(value.value, baseUrl).toString();
        const mapped = resourcesMap.get(link) || link;
        value.value = `'${mapped}'`;
      } else {
        const link = new URL(value.value.substr(1, value.value.length - 2), baseUrl).toString();
        const mapped = resourcesMap.get(link) || link;
        value.value = `'${mapped}'`;
      }
    });
    return csstree.generate(ast);
  },
};
