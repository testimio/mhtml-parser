const { expect } = require('chai');

const Parser = require('./parser');

describe('the mhtml parser', () => {
  it('parses basic files', () => {
    const mhtml = build([{
      body: '<html><body>Hello World!</body></html>',
      location: 'http://testim.io/',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(1);
    expect(results[0].filename).to.equal('http!testim.io');
    expect(results[0].content.trim()).to.equal('<html><body>Hello World!</body></html>');
  });

  it('throws if no boundary', () => {
    const mhtml = '<html><body>Hello World!</body></html>';
    const p = new Parser();
    expect(() => p.parse(mhtml).rewrite().spit()).to.throw();
  });

  it('parses basic files with image links', () => {
    const mhtml = build([{
      body: '<html><body><img src="http://example.com/1.jpg"></body></html>',
      location: 'http://example.com/main.html',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].filename).to.equal('http!example.com!main.html');
    expect(results[0].content.trim()).to.equal('<html><body><img src="http!example.com!1.jpg"></body></html>');
  });


  it('parses mime types of frames', () => {
    const mhtml = build([{
      body: "<html><body><img src='http://example.com/1.jpg'></body></html>",
      location: 'http://example.com/main.html',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].type).to.equal('text/html');
    expect(results[1].type).to.equal('image/jpeg');
  });

  it('parses basic files multiple with image links', () => {
    const mhtml = build([{
      body: '<html><body><img src="http://example.com/1.jpg"><img src="http://example.com/1.jpg"></body></html>',
      location: 'http://example.com/main.html',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].filename).to.equal('http!example.com!main.html');
    expect(results[0].content.trim()).to.equal('<html><body><img src="http!example.com!1.jpg"><img src="http!example.com!1.jpg"></body></html>');
  });

  it('parses iframes files', () => {
    const mhtml = build([{
      body: "<html><body><iframe src='cid:1@blink.mhtml'></iframe></body></html>",
      location: 'http://example.com/main.html',
    }, {
      body: '<html><body>Hello World</body></html>',
      location: 'http://example.com/frame.html',
      id: '1@blink.mhtml',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].filename).to.equal('http!example.com!main.html');
    expect(results[0].content.trim()).to.equal("<html><body><iframe src='http!example.com!frame.html'></iframe></body></html>");
  });

  it('parses nested iframes files', () => {
    const mhtml = build([{
      body: '<html><body><iframe src="cid:1@blink.mhtml"></iframe></body></html>',
      location: 'http://example.com/main.html',
    }, {
      body: '<html><body><iframe src="cid:2@blink.mhtml"></iframe></body></html>',
      location: 'http://example.com/one.html',
      id: '1@blink.mhtml',
    },
    {
      body: '<html><body>Hello World!</body></html>',
      location: 'http://example.com/two.html',
      id: '2@blink.mhtml',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(3);
    expect(results[0].filename).to.equal('http!example.com!main.html');
    expect(results[0].content.trim()).to.equal('<html><body><iframe src="http!example.com!one.html"></iframe></body></html>');
    expect(results[1].content.trim()).to.equal('<html><body><iframe src="http!example.com!two.html"></iframe></body></html>');
    expect(results[2].content.trim()).to.equal('<html><body>Hello World!</body></html>');
  });

  it('parses nested images in iframes files', () => {
    const mhtml = build([{
      body: '<html><body><iframe src="cid:1@blink.mhtml"></iframe></body></html>',
      location: 'http://example.com/main.html',
    }, {
      body: '<html><body><img src="http://example.com/1.jpg"></body></html>',
      location: 'http://example.com/one.html',
      id: '1@blink.mhtml',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(3);
    expect(results[0].filename).to.equal('http!example.com!main.html');
    expect(results[0].content.trim()).to.equal('<html><body><iframe src="http!example.com!one.html"></iframe></body></html>');
    expect(results[1].content.trim()).to.equal('<html><body><img src="http!example.com!1.jpg"></body></html>');
  });

  it('parses base tags', () => {
    const mhtml = build([{
      body: '<html><body><base href="./foo/"><img src="./1.jpg"></body></html>',
      location: 'http://example.com/one.html',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/foo/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].content.trim()).to.equal('<html><body><base href=""><img src="http!example.com!foo!1.jpg"></body></html>');
  });

  it('parses css files', () => {
    const mhtml = build([{
      body: 'body{}',
      type: 'text/css',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(1);
    expect(results[0].content.trim()).to.equal('body{}');
  });

  it("parses complex'ish css files", () => {
    const mhtml = build([{
      body: 'body{}h1{}h2{}.foo.bar{}a[href][css].foo#bar{}',
      type: 'text/css',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(1);
    expect(results[0].content.trim()).to.equal('body{}h1{}h2{}.foo.bar{}a[href][css].foo#bar{}');
  });

  it('replaces CSS links', () => {
    const mhtml = build([{
      body: 'body{background-image:url(./1.jpg);}',
      type: 'text/css',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].content.trim()).to.equal("body{background-image:url('http!example.com!1.jpg');}");
  });

  it('replaces absoluite CSS links', () => {
    const mhtml = build([{
      body: 'body{background-image:url(http://example.com/1.jpg);}',
      type: 'text/css',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].content.trim()).to.equal("body{background-image:url('http!example.com!1.jpg');}");
  });

  it('replaces multiple absoluite CSS links', () => {
    const mhtml = build([{
      body: 'body{background-image:url(http://example.com/1.jpg);background:url(http://example.com/1.jpg);}',
      type: 'text/css',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].content.trim()).to.equal("body{background-image:url('http!example.com!1.jpg');background:url('http!example.com!1.jpg');}");
  });

  it('extracts mime types', () => {
    const mhtml = build([{
      body: 'body{background-image:url(http://example.com/1.jpg);background:url(http://example.com/1.jpg);}',
      type: 'text/css',
    }, {
      body: 'a2FrYQ==',
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser();
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(2);
    expect(results[0].type).to.equal('text/css');
    expect(results[1].type).to.equal('image/jpeg');
  });

  it('ignores files larger than maxFileSize mime types', () => {
    const mhtml = build([{
      body: 'body{background-image:url(http://example.com/1.jpg);}',
      type: 'text/css',
    }, {
      body: `${'a2FrYQ'.repeat(1e4)}==`,
      transferEncoding: 'base64',
      location: 'http://example.com/1.jpg',
      type: 'image/jpeg',
    }]);
    const p = new Parser({ maxFileSize: 1e3 });
    const results = p.parse(mhtml).rewrite().spit();
    expect(results.length).to.equal(1);
    // didn't rewrite because of the large file removed
    expect(results[0].content.trim()).to.equal("body{background-image:url('http://example.com/1.jpg');}");
  });
});


function build(contents) {
  function buildPart(part) {
    const headers = [
      `Content-Type: ${part.type || 'text/html'}`,
      `Content-Location: ${part.location || 'http://example.com'}`,
      `Content-Transfer-Encoding: ${part.transferEncoding || 'binary'}`,
    ];
    if (part.id) {
      headers.push(`Content-ID: <${part.id}>`);
    }
    return `${headers.join('\r\n')}\r\n\r\n${part.body}`;
  }
  return header() + boundary() + contents.map(buildPart).join(boundary()) + boundary();
}
function header() {
  return `From: <Saved by Benji>
  Snapshot-Content-Location: http://example.com/
  Subject: Example Domain
  Date: Wed, 12 Dec 2018 18:00:54 -0000
  MIME-Version: 1.0
  Content-Type: multipart/related;
    type="text/html";
    boundary="----MultipartBoundary--k9eaNRyWWhTZ1w3udCxlzhXsJDCZFc9N9slfmdZezg----"


  `;
}
function boundary() {
  return '\r\n------MultipartBoundary--k9eaNRyWWhTZ1w3udCxlzhXsJDCZFc9N9slfmdZezg----\r\n'; // note this is two `-`s more
  // technically the last boundary should have two additional --s
}
