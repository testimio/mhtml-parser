const cheerio = require('cheerio');
const csstree = require('css-tree');
const { URL } = require('url');

module.exports = {
  html(domString, resourcesMap, baseUrl) {
    const $ = cheerio.load(domString, {
      _useHtmlParser2: true, // cheerio 1 uses parse5 by default which is half the speed
      lowerCaseTags: false,
    });
    const pageBase = $('base[href]').attr('href');

    if (pageBase) {
      baseUrl = new URL(pageBase, baseUrl);
    }

    // img, picture, audio, video, script, source, iframe

    $('[src]').each((i, el) => {
      el = $(el);
      const link = new URL(el.attr('src'), baseUrl).toString();
      const mapped = resourcesMap.get(link) || link;
      el.attr('src', mapped);
    });

    $('[srcset]').each((i, el) => {
      el = $(el);
      const sources = el.attr('srcset').split(' ');
      el.attr('srcset', sources.map(src => new URL(src, baseUrl).toString()).map(m => resourcesMap.get(m) || m));
    });

    // css imports and link rel prefetch/prerender

    $('link[href]').each((i, el) => {
      el = $(el);
      const link = new URL(el.attr('href'), baseUrl).toString();
      const mapped = resourcesMap.get(link) || link;
      el.attr('href', mapped);
    });

    $('svg').find('[href],[xlink\\:href]').each((i, el) => {
      el = $(el);
      const link = new URL(el.attr('href') || el.attr('xlink:href'), baseUrl).toString();
      const mapped = resourcesMap.get(link) || link;
      el.removeAttr('xlink:href');
      el.attr('href', mapped);
    });

    // old and deprecated stuff

    $('meta[http-equiv=refresh]').each((i, el) => {
      el = $(el);
      const re = /(\d)+; ?URL='?([^']*)'?/gi;
      const [, seconds, url] = re.exec(el.attr('content'));
      const link = new URL(url, baseUrl).toString();
      const mapped = resourcesMap.get(link) || link;
      el.attr('content', `${seconds}; url=${mapped}`);
    });

    $('object[data]').each((i, el) => {
      el = $(el);
      const link = new URL(el.attr('data'), baseUrl).toString();
      const mapped = resourcesMap.get(link) || link;
      el.attr('data', mapped);
    });

    $('applet[code]').each((i, el) => {
      el = $(el);
      const link = new URL(el.attr('code'), baseUrl).toString();
      const mapped = resourcesMap.get(link) || link;
      el.attr('code', mapped);
    });

    return $.html();
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
