const { expect } = require('chai');
const {
  css, html, svg, cssWithAst, htmlWithCheerio
} = require('./link-replacer');

describe('link replacing', () => {
  describe('css', () => {
    it('replaces CSS links', () => {
      const translated = css(
        "body{background-image:url('http://example.com/1.txt');}",
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt');}");
    });

    it('replaces relative CSS links', () => {
      const translated = css(
        "body{background-image:url('./1.txt');}",
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt');}");
    });

    it('does not rewrite about:blank', () => {
      const translated = css(
        "body{background-image:url('//about:blank');}",
        new Map(),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url('//about:blank');}");
    });

    it('replaces unquoted CSS links', () => {
      const translated = css(
        'body{background-image:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt');}");
    });

    it('works with protocol agnostic urls', () => {
      const translated = css(
        'body{background-image:url(//example.com/1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt');}");
    });

    it('replaces unquoted absolute CSS links', () => {
      const translated = css(
        'body{background-image:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt');}");
    });
    it('replaces multiple CSS links', () => {
      const translated = css(
        'body{background-image:url(./1.txt);background:url(./1.txt);font:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt');"
      + "background:url('http://testim.io/1.txt');font:url('http://testim.io/1.txt');}");
    });
  });

  describe('cssWithAst', () => {
    it('replaces CSS links', () => {
      const translated = cssWithAst(
        "body{background-image:url('http://example.com/1.txt');}",
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url(\\'http://testim.io/1.txt\\')}");
    });
    it('replaces relative CSS links', () => {
      const translated = cssWithAst(
        "body{background-image:url('./1.txt');}",
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url(\\'http://testim.io/1.txt\\')}");
    });

    it('replaces unquoted CSS links', () => {
      const translated = cssWithAst(
        'body{background-image:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url(\\'http://testim.io/1.txt\\')}");
    });

    it('works with protocol agnostic urls', () => {
      const translated = cssWithAst(
        'body{background-image:url(//example.com/1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url(\\'http://testim.io/1.txt\\')}");
    });

    it('replaces unquoted absolute CSS links', () => {
      const translated = cssWithAst(
        'body{background-image:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url(\\'http://testim.io/1.txt\\')}");
    });
    it('replaces multiple CSS links', () => {
      const translated = cssWithAst(
        'body{background-image:url(./1.txt);background:url(./1.txt);font:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("body{background-image:url(\\'http://testim.io/1.txt\\');"
      + "background:url(\\'http://testim.io/1.txt\\');font:url(\\'http://testim.io/1.txt\\')}");
    });
  });

  describe('html', () => {
    const wrap = (el) => `<html><head></head><body>${el}</body></html>`;

    it('replaces img src tags', () => {
      const translated = html(
        wrap`<img src='http://example.com/1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src='http://testim.io/1.txt'>`);
    });

    it('does not replace about:blank', () => {
      const translated = html(
        wrap`<img src='//about:blank'>`,
        new Map(),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src='//about:blank'>`);
    });

    it('replaces unescaped img src tags', () => {
      const translated = html(
        wrap`<img src=http://example.com/1.txt >`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src=http://testim.io/1.txt >`);
    });

    it('replaces unescaped img src tags without space', () => {
      const translated = html(
        wrap`<img src=http://example.com/1.txt>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src=http://testim.io/1.txt>`);
    });

    it('ignores uninteresting unescaped attributes ', () => {
      const translated = html(
        wrap`<img kaka data foo=bar src=http://example.com/1.txt>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img kaka data foo=bar src=http://testim.io/1.txt>`);
    });

    it('ignores hash in urls', () => {
      const translated = html(
        wrap`<img src='http://example.com/1.txt#foo'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src='http://testim.io/1.txt#foo'>`);
    });

    it('ignores hash only urls', () => {
      const translated = html(
        wrap`<img src='#foo'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src='#foo'>`);
    });

    it('replaces img src tags ignoring non-value attrs', () => {
      const translated = html(
        wrap`<img disabled src='http://example.com/1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img disabled src='http://testim.io/1.txt'>`);
    });

    it('replaces CSS style links', () => {
      const translated = html(
        "<img blabl style='background-image:url(http://example.com/1.txt);'>",
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("<img blabl style='background-image:url(&quot;http://testim.io/1.txt&quot;);'>");
    });

    it('replaces inline CSS links links', () => {
      const translated = html(
        "<style>body{background-image:url('./1.txt');}</style>",
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal("<style>body{background-image:url('http://testim.io/1.txt');}</style>");
    });

    it('ignores comments', () => {
      const translated = html(
        wrap`<img src='http://example.com/1.txt'><!-- foo -->`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src='http://testim.io/1.txt'><!-- foo -->`);
    });

    it('replaces relative img src tags', () => {
      const translated = html(
        wrap`<img src='./1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src='http://testim.io/1.txt'>`);
    });

    it('replaces img srcset tags', () => {
      const translated = html(
        wrap`<img\tblabla srcset="./1.txt">`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img\tblabla srcset="http://testim.io/1.txt">`);
    });

    it('replaces link href values', () => {
      const translated = html(
        wrap`<link rel="stylesheet" href="http://example.com/1.txt">`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<link rel="stylesheet" href="http://testim.io/1.txt">`);
    });

    it('replaces relative link href values', () => {
      const translated = html(
        wrap`<link rel="stylesheet" href="./1.txt">`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<link rel="stylesheet" href="http://testim.io/1.txt">`);
    });

    it('takes base tags into acount', () => {
      const translated = html(
        wrap`<base href="./foo/"> <img src="./1.txt">`,
        new Map([['http://example.com/foo/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<base href=""> <img src="http://testim.io/1.txt">`);
    });

    it('replaces xlink:href in svg tags', () => {
      const translated = html(
        wrap`<svg><feImage xlink:href="http://example.com/1.txt"/></svg>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<svg><feImage xlink:href="http://testim.io/1.txt"/></svg>`);
    });

    it('replaces image in svg tags', () => {
      const translated = html(
        wrap`<svg><image xlink:href="http://example.com/1.txt"/></svg>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<svg><image xlink:href="http://testim.io/1.txt"/></svg>`);
    });

    it('replaces use in svg tags', () => {
      const translated = html(
        wrap`<svg><use xlink:href="http://example.com/1.txt"/></svg>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<svg><use xlink:href="http://testim.io/1.txt"/></svg>`);
    });

    it('replaces href in svg tags', () => {
      const translated = html(
        wrap`<svg><feImage href="http://example.com/1.txt"/></svg>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<svg><feImage href="http://testim.io/1.txt"/></svg>`);
    });

    it.skip('replaces meta redirects', () => {
      const translated = html(
        wrap`<meta http-equiv="refresh" content="0;URL='http://example.com/1.txt'" />`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<meta http-equiv="refresh" content="0; url=http://testim.io/1.txt">`);
    });

    it('applet code', () => {
      const translated = html(
        wrap`<applet code="http://example.com/1.txt"></applet>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<applet code="http://testim.io/1.txt"></applet>`);
    });
  });

  describe('svg', () => {
    it('replaces svg hrefs', () => {
      const translated = svg(
        '<svg><feImage href="http://example.com/1.txt"/></svg>',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal('<svg><feImage href="http://testim.io/1.txt"/></svg>');
    });

    it('ignores unmatched svg hrefs', () => {
      const translated = svg(
        '<svg><feImage href="http://example.com/foo"/></svg>',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal('<svg><feImage href="http://example.com/foo"/></svg>');
    });

    it('replaces svg xlink:hrefs', () => {
      const translated = svg(
        '<svg><feImage xlink:href="http://example.com/1.txt"/></svg>',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal('<svg><feImage href="http://testim.io/1.txt"/></svg>');
    });
  });

  describe('html with cheerio', () => {
    const wrap = (el) => `<html><head></head><body>${el}</body></html>`;

    it('replaces img src tags', () => {
      const translated = htmlWithCheerio(
        wrap`<img src='http://example.com/1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src="http://testim.io/1.txt">`);
    });

    it('replaces relative img src tags', () => {
      const translated = htmlWithCheerio(
        wrap`<img src='./1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img src="http://testim.io/1.txt">`);
    });

    it('replaces img srcset tags', () => {
      const translated = htmlWithCheerio(
        wrap`<img srcset="./1.txt">`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<img srcset="http://testim.io/1.txt">`);
    });

    it('replaces link href values', () => {
      const translated = htmlWithCheerio(
        wrap`<link rel="stylesheet" href="http://example.com/1.txt">`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<link rel="stylesheet" href="http://testim.io/1.txt">`);
    });

    it('replaces relative link href values', () => {
      const translated = htmlWithCheerio(
        wrap`<link rel="stylesheet" href="./1.txt">`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<link rel="stylesheet" href="http://testim.io/1.txt">`);
    });

    it('takes base tags into acount', () => {
      const translated = htmlWithCheerio(
        wrap`<base href="./foo/"> <img src="./1.txt">`,
        new Map([['http://example.com/foo/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<base href="./foo/"> <img src="http://testim.io/1.txt">`);
    });

    it('replaces xlink:href in svg tags', () => {
      const translated = htmlWithCheerio(
        wrap`<svg><feImage xlink:href="http://example.com/1.txt"/></svg>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<svg><feImage href="http://testim.io/1.txt"/></svg>`);
    });

    it('replaces href in svg tags', () => {
      const translated = htmlWithCheerio(
        wrap`<svg><feImage href="http://example.com/1.txt"/></svg>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<svg><feImage href="http://testim.io/1.txt"/></svg>`);
    });

    it.skip('replaces meta redirects', () => {
      const translated = htmlWithCheerio(
        wrap`<meta http-equiv="refresh" content="0;URL='http://example.com/1.txt'" />`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<meta http-equiv="refresh" content="0; url=http://testim.io/1.txt">`);
    });

    it('applet code', () => {
      const translated = htmlWithCheerio(
        wrap`<applet code="http://example.com/1.txt"></applet>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com'
      );
      expect(translated).to.equal(wrap`<applet code="http://testim.io/1.txt"></applet>`);
    });
  });
});
