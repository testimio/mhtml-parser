const MAX_EXTRA_SPACE = 1024 * 1024 * 5; // 5mb
const attrs = {
  SRC: 1,
  SRCSET: 2,
  HREF: 3,
  DATA: 6,
  CODE: 7,
  OTHER: 10,
};


function generateIs(str) {
  const body = str.split('')
    .map(s => `(${s} === ${s.toLowerCase().charCodeAt(0)} || ${s} === ${s.toUpperCase().charCodeAt(0)})`)
    .join(' && ');
  /* eslint-disable */
  return Function(...str, `return ${body}`);
}
const isSrc = generateIs('src');
const isSrcSet = generateIs('srcset');
const isHref = generateIs('href');
const isData = generateIs('data');
const isCode = generateIs('code');

const c = {
  ANGLE_OPEN: '<'.charCodeAt(0),
  ANGLE_CLOSE: '>'.charCodeAt(0),
  SLASH_N: '\n'.charCodeAt(0),
  SLASH_R: '\r'.charCodeAt(0),
  D_QUOTE: '"'.charCodeAt(0),
  QUOTE: "'".charCodeAt(0),
  EXCLAM_MARK: '!'.charCodeAt(0),
  BIG_A: 'A'.charCodeAt(0),
  BIG_Z: 'Z'.charCodeAt(0),
  SMALL_A: 'a'.charCodeAt(0),
  SMALL_Z: 'z'.charCodeAt(0),
  ZERO: '0'.charCodeAt(0),
  NINE: '9'.charCodeAt(0),
  S: 'S'.charCodeAt(0),
  s: 's'.charCodeAt(0),
  R: 'R'.charCodeAt(0),
  r: 'r'.charCodeAt(0),
  C: 'C'.charCodeAt(0),
  c: 'c'.charCodeAt(0),
  H: 'H'.charCodeAt(0),
  h: 'h'.charCodeAt(0),
  E: 'E'.charCodeAt(0),
  e: 'e'.charCodeAt(0),
  F: 'F'.charCodeAt(0),
  f: 'f'.charCodeAt(0),
  T: 'T'.charCodeAt(0),
  t: 't'.charCodeAt(0),
  EQUALS: '='.charCodeAt(0),
  SLASH: '/'.charCodeAt(0),
};

class Generator {
  constructor(data, mapping, baseUrl) {
    this.reset(data, mapping, baseUrl);
    this.replaced = Buffer.alloc(data.length + MAX_EXTRA_SPACE); // output prealloc, can be reused between runs
  }

  reset(data, mapping, baseUrl) {
    this.data = data;
    this.len = data.length;
    this.mapping = mapping;
    this.baseUrl = baseUrl;
    this.i = 0; // data pointer
    this.j = 0; // replaced pointer
  }

  result() {
    return Buffer.from(this.replaced.slice(0, this.j));
  }

  parse() {
    this.parseWalking();
  }

  parseWalking() {
    while (this.lenOk()) {
      while (this.data[this.i] !== c.ANGLE_OPEN && this.lenOk()) { // outside of tag
        this.addAndProgress();
      }
      if (this.data[this.i + 1] === c.EXCLAM_MARK) {
        this.parseComment();
      }
      if (this.lenOk()) {
        this.parseTag();
      }
    }
  }

  parseComment() {
    while ((this.current() !== c.EXCLAM_MARK && this.data[this.i + 1] !== c.ANGLE_CLOSE) && this.lenOk()) {
      this.addAndProgress();
    }
    this.addAndProgress();
  }

  parseTag() {
    this.addAndProgress(); // <
    if (this.current() === c.SLASH) { // closing tag
      while (this.current() !== c.ANGLE_CLOSE && this.lenOk()) {
        this.addAndProgress();
      }
      if (this.current() === c.ANGLE_CLOSE) {
        this.addAndProgress(); // add >
      }
      return;
    }
    const tagName = this.parseTagName();
    this.processWhitespace();
    while (this.current() !== c.ANGLE_CLOSE && this.lenOk()) {
      if (this.current() === c.SLASH && this.data[this.i + 1] === c.ANGLE_CLOSE) { // /> in tag which is a noop
        this.addAndProgress();
        this.continue;
      }
      const attribute = this.parseTagAttributeName();
      if (this.current() !== c.EQUALS) {
        this.processWhitespace();
        continue;
      }
      this.addAndProgress(); // read the =
      const quoteType = this.readQuote();
      if (!this.isInterestingTagAttrName(tagName, attribute)) {
        this.readTagAttributeValue(quoteType);
        this.processWhitespace();
        continue;
      }
      const fromHtml = this.parseTagAttributeValueWithoutProgressingReplaced(quoteType);
      let value = this.getLink(attribute, fromHtml);

      if (tagName === 'base') { // this is in fact the base tag!
        this.baseUrl = new URL(fromHtml, this.baseUrl);
        // TODO deal with the case the base tag appears _AFTER_ links, we need to "go back" and replace all links in this case
        //     which is very lame
        value = fromHtml;
      }
      // console.log("tag", tagName, "attr", attribute, fromHtml, "->", value);
      for (let k = 0; k < value.length; k++) {
        this.replaced[this.j++] = value.charCodeAt(k); // in practice, this should replace the value with url resolution if helpful
      }
      if (quoteType !== 0) { // had quote, add same quote
        this.replaced[this.j++] = quoteType;
      }
      this.processWhitespace();
    }
    if (this.current() === c.ANGLE_CLOSE) {
      this.addAndProgress(); // add >
    }
  }

  getLink(attribute, fromHtml) {
    const resolveLink = link => new URL(link, this.baseUrl).toString();
    if (attribute === attrs.SRCSET) {
      return fromHtml.split(' ').map(resolveLink).map(part => this.mapping.get(part) || part).join(' ');
    }
    const link = resolveLink(fromHtml);
    return this.mapping.get(link) || link;
  }

  isInterestingTagAttrName(tagName, attribute) {
    if (attribute === attrs.OTHER) {
      return false;
    }
    if (attribute === attrs.SRC || attribute === attrs.SRCSET) {
      return true; // [src],[srcset]
    }
    if (attribute === attrs.HREF) {
      return tagName === 'link' || tagName === 'feimage' || tagName === 'image' || tagName === 'base'; // link[href];
    }
    if (attribute === attrs.DATA) {
      return tagName === 'object';
    }
    if (attribute === attrs.CODE) {
      return tagName === 'applet';
    }
    return false;
  }

  readQuote() {
    if (this.current() === c.QUOTE) {
      this.addAndProgress();
      return c.QUOTE;
    }
    if (this.current() === c.D_QUOTE) {
      this.addAndProgress();
      return c.D_QUOTE;
    }
    return 0; // unescaped attribute value, read until whitespace
  }

  readTagAttributeValue(quoteCharCode) {
    if (quoteCharCode !== 0) { // escaped
      while (this.current() !== quoteCharCode && this.lenOk()) {
        this.addAndProgress();
      }
      this.addAndProgress();
    } else { // unescaped
      while (!isWhitespace(this.current()) && this.lenOk()) {
        this.addAndProgress();
      }
    }
  }

  parseTagAttributeValueWithoutProgressingReplaced(quoteCharCode) {
    const initial = this.i;
    if (quoteCharCode !== 0) { // escaped
      while (this.current() !== quoteCharCode && this.lenOk()) {
        this.i++;
      }
      this.i++; // rread the quote
      return this.data.toString('utf8', initial, this.i - 1);
    } // unescaped
    while (!isWhitespace(this.current()) && this.lenOk()) {
      this.i++;
    }
    return this.data.toString('utf8', initial, this.i);
  }

  current() {
    return this.data[this.i];
  }

  parseTagAttributeName() {
    const initial = this.i;
    while (this.current() !== c.EQUALS && !isWhitespace(this.current()) && this.lenOk()) {
      this.addAndProgress();
    }
    const len = this.i - initial;
    const data = this.data;
    // console.log(this.data.toString("utf8", initial, this.i));
    if (len === 3) {
      if (isSrc(data[initial], data[initial + 1], data[initial + 2])) {
        return attrs.SRC;
      }
      return attrs.OTHER;
    }
    if (len === 4) {
      if (isHref(data[initial], data[initial + 1], data[initial + 2], data[initial + 3])) {
        return attrs.HREF;
      }
      if (isCode(data[initial], data[initial + 1], data[initial + 2], data[initial + 3])) {
        return attrs.CODE;
      }
      if (isData(data[initial], data[initial + 1], data[initial + 2], data[initial + 3])) {
        return attrs.Data;
      }

      return attrs.OTHER;
    }
    if (len === 6) {
      if (isSrcSet(
        data[initial], data[initial + 1], data[initial + 2], data[initial + 3], data[initial + 4], data[initial + 5],
      )) {
        return attrs.SRCSET;
      }
      return attrs.OTHER;
    }
    return attrs.OTHER;
  }

  processWhitespace() {
    while (isWhitespace(this.current()) && this.lenOk()) {
      this.addAndProgress();
    }
  }

  parseTagName() {
    const initial = this.i;
    while (this.current() !== c.ANGLE_CLOSE && !isWhitespace(this.current()) && this.lenOk()) {
      this.addAndProgress();
    }
    // TODO no need to allocate all these strings!
    return this.data.toString('utf8', initial, this.i).toLowerCase();
  }

  addAndProgress() {
    this.replaced[this.j] = this.data[this.i];
    this.i++;
    this.j++;
  }

  lenOk() {
    return this.i < this.len;
  }
}

function isWhitespace(charCode) {
  switch (charCode) {
    case (0x0009):
    case (0x000B):
    case (0x000C):
    case (0x0020):
    case (0x000A):
    case (0x000D):
      return true;
    default:
      return false;
  }
}

// const data = Buffer.from("<html><body><img baba src='foo.html'></body></html>");
// const mapping = new Map([
//   ["foo.html", "http://testim.io/bar.html"]])
// const g = new Generator(data, mapping);

// g.parse();

// console.log(g.result().toString());

module.exports = Generator;
