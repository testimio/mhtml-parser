const { css, html, svg } = require('./link-replacer');
const expect = require('chai').expect;

describe('link replacing', () => {
  describe('css', () => {
    it('replaces CSS links', () => {
      const translated = css(
        "body{background-image:url('http://example.com/1.txt');}",
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt')}");
    });
    it('replaces relative CSS links', () => {
      const translated = css(
        "body{background-image:url('./1.txt');}",
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt')}");
    });

    it('replaces unquoted CSS links', () => {
      const translated = css(
        'body{background-image:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt')}");
    });
    it('replaces unquoted absolute CSS links', () => {
      const translated = css(
        'body{background-image:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt')}");
    });
    it('replaces multiple CSS links', () => {
      const translated = css(
        'body{background-image:url(./1.txt);background:url(./1.txt);font:url(./1.txt);}',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal("body{background-image:url('http://testim.io/1.txt');"
      + "background:url('http://testim.io/1.txt');font:url('http://testim.io/1.txt')}");
    });
  });
  describe('html', () => {
    const wrap = el => `<html><head></head><body>${el}</body></html>`;

    it('replaces img src tags', () => {
      const translated = html(
        wrap`<img src='http://example.com/1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<img src="http://testim.io/1.txt">`);
    });

    it('replaces relative img src tags', () => {
      const translated = html(
        wrap`<img src='./1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<img src="http://testim.io/1.txt">`);
    });

    it('replaces img srcset tags', () => {
      const translated = html(
        wrap`<img srcset='./1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<img srcset="http://testim.io/1.txt">`);
    });

    it('replaces link href values', () => {
      const translated = html(
        wrap`<link rel='stylesheet' href='http://example.com/1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<link rel="stylesheet" href="http://testim.io/1.txt">`);
    });

    it('replaces relative link href values', () => {
      const translated = html(
        wrap`<link rel='stylesheet' href='./1.txt'>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<link rel="stylesheet" href="http://testim.io/1.txt">`);
    });

    it('takes base tags into acount', () => {
      const translated = html(
        wrap`<base href="./foo/"> <img src='./1.txt'>`,
        new Map([['http://example.com/foo/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<base href="./foo/"> <img src="http://testim.io/1.txt">`);
    });

    it('replaces xlink:href in svg tags', () => {
      const translated = html(
        wrap`<svg><feImage xlink:href="http://example.com/1.txt"/></svg>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<svg><feImage href="http://testim.io/1.txt"/></svg>`);
    });

    it('replaces href in svg tags', () => {
      const translated = html(
        wrap`<svg><feImage href="http://example.com/1.txt"/></svg>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<svg><feImage href="http://testim.io/1.txt"/></svg>`);
    });

    it('replaces meta redirects', () => {
      const translated = html(
        wrap`<meta http-equiv="refresh" content="0;URL='http://example.com/1.txt'" />`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<meta http-equiv="refresh" content="0; url=http://testim.io/1.txt">`);
    });

    it('applet code', () => {
      const translated = html(
        wrap`<applet code="http://example.com/1.txt"></applet>`,
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal(wrap`<applet code="http://testim.io/1.txt"></applet>`);
    });
  });
  describe('svg', () => {
    it('replaces svg hrefs', () => {
      const translated = svg(
        '<svg><feImage href="http://example.com/1.txt"/></svg>',
        new Map([['http://example.com/1.txt', 'http://testim.io/1.txt']]),
        'http://example.com',
      );
      expect(translated).to.equal('<svg><feImage href="http://testim.io/1.txt"/></svg>');
    });
  });
});
