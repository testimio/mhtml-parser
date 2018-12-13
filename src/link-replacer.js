const cheerio = require("cheerio");
const csstree = require("css-tree");
const URL = require('url').URL;

module.exports = {
  html(domString, resourcesMap, baseUrl) {
    let $ = cheerio.load(domString);
    let pageBase = $("base[href]").attr("href");

    if (pageBase) {
      baseUrl = new URL(pageBase, baseUrl);
    }

    // img, picture, audio, video, script, source, iframe

    $("[src]").each((i, el) => {
      el = $(el);
      let link = new URL(el.attr("src"), baseUrl).toString();
      let mapped = resourcesMap.get(link) || link;
      el.attr("src", mapped);
    });
    
    $("[srcset]").each((i, el) => {
      el = $(el);
      let sources = el.attr("srcset").split(" ");
      el.attr("srcset", sources.map(src => new URL(src, baseUrl).toString()).map(m => resourcesMap.get(m) || m));
    });

    // css imports and link rel prefetch/prerender

    $("link[href]").each((i, el) => {
      el = $(el);
      let link = new URL(el.attr("href"), baseUrl).toString();
      let mapped = resourcesMap.get(link) || link;
      el.attr("href", mapped);
    });

    $("svg").find("[href],[xlink\\:href]").each((i, el) => {
      el = $(el);
      let link = new URL(el.attr("href") || el.attr("xlink:href"), baseUrl).toString();
      let mapped = resourcesMap.get(link) || link;
      el.removeAttr("xlink:href");
      el.attr("href", mapped);
    });

    // old and deprecated stuff 

    $("meta[http-equiv=refresh]").each((i, el) => {
      el = $(el);
      let re = /(\d)+; ?URL='?([^']*)'?/gi;
      let [_, seconds, url] = re.exec(el.attr("content"));
      let link = new URL(url, baseUrl).toString();
      let mapped = resourcesMap.get(link) || link;
      el.attr("content", `${seconds}; url=${mapped}`);
    });

    $("object[data]").each((i, el) => {
      el = $(el);
      let link = new URL(el.attr("data"), baseUrl).toString();
      let mapped = resourcesMap.get(link) || link;
      el.attr("data", mapped);
    });

    $("applet[code]").each((i, el) => {
      el = $(el);
      let link = new URL(el.attr("code"), baseUrl).toString();
      let mapped = resourcesMap.get(link) || link;
      el.attr("code", mapped);
    });

    return $.html();
  },
  svg(svgString, resourcesMap, baseUrl) {
    let $ = cheerio.load(svgString, { xmlMode: true });
    $("[href],[xlink\\:href]").each((i, el) => {
      el = $(el);
      let link = new URL(el.attr("href") || el.attr("xlink:href"), baseUrl).toString();
      let mapped = resourcesMap.get(link) || link;
      el.removeAttr("xlink:href");
      el.attr("href", mapped);
    });
    return $.html();
  },
  css(cssString, resourcesMap, baseUrl) {
    let ast = csstree.parse(cssString);
    csstree.walk(ast, node => {
      if (this.declaration === null || node.type !== 'Url') {
        return;
      }
      const value = node.value;
      if (value.type === 'Raw') {
        let link = new URL(value.value, baseUrl).toString();
        let mapped = resourcesMap.get(link) || link;
        value.value = "'" + mapped + "'";
      } else {
        let link = new URL( value.value.substr(1, value.value.length - 2), baseUrl).toString();
        let mapped = resourcesMap.get(link) || link;
        value.value = "'" + mapped + "'";
      }
    });
    return csstree.generate(ast);
  }
}