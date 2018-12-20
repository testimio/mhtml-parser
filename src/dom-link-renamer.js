const { URL } = require('url'); // url isn't global in Node < 8


const MAX_EXTRA_SPACE = 1024 * 1024 * 5; // 5mb
const attrs = {
  SRC: 1,
  SRCSET: 2,
  HREF: 3,
  XLINKHREF: 4,
  DATA: 6,
  CODE: 7,
  STYLE: 8,
  OTHER: 10,
};

function generateIs(str) {
  str = str.split('').map(x => x.replace(':', 'COLON'));
  const mapBack = (s) => {
    if (s === 'COLON') return ':';
    return s;
  };
  const body = str
    .map(s => `(${s} === ${mapBack(s).toLowerCase().charCodeAt(0)} || ${s} === ${mapBack(s).toUpperCase().charCodeAt(0)})`)
    .join(' && ');
  /* eslint-disable */
  return Function(...str, `return ${body}`);
}
const isSrc = generateIs('src');
const isSrcSet = generateIs('srcset');
const isXlinkHref = generateIs('xlink:href');
const isHref = generateIs('href');
const isData = generateIs('data');
const isCode = generateIs('code');
const isStyle = generateIs('style');

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
  DASH: '-'.charCodeAt(0)
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
      while (this.lenOk() && this.data[this.i] !== c.ANGLE_OPEN) { // outside of tag
        this.addAndProgress();
      }
      if (this.data[this.i + 1] === c.EXCLAM_MARK && this.data[this.i + 2] === c.DASH) {
        this.parseComment();
        continue;
      }
      if (this.lenOk()) {
        this.parseTag();
      }
    }
  }

  parseComment() {
    while (!(this.current() === c.DASH && this.data[this.i + 1] === c.ANGLE_CLOSE) && this.lenOk()) {
      this.addAndProgress();
    }
    this.addAndProgress();// -
    this.addAndProgress();// >

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
      if (this.current() === c.SLASH) { // /> in tag which is a noop, as an optimization we don't check the following angle-close
        this.addAndProgress();
        continue;
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
      let value = '';
      if (attribute === attrs.STYLE) {
        value = this.cssProcessor ? this.cssProcessor(fromHtml, this.mapping, this.baseUrl, true) : fromHtml;
      } else if (tagName === 'base') {
        this.baseUrl = new URL(fromHtml, this.baseUrl);
        // TODO deal with the case the base tag appears _AFTER_ links, we need to "go back" and replace all links in this case
        //     which is very lame
        value = ''; // write empty base
      } else {
        value = this.getLink(attribute, fromHtml);
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
    if (tagName === 'style') {
      return this.parseStyleTag(); // style tag handling
    }
  }
  parseStyleTag() {
    // special style tag handling, can't nest, treat whole content as CSS
    let initial = this.i;
    const isEnd = () => 
      this.current() === c.ANGLE_OPEN &&
      this.data[this.i + 1] === c.SLASH && 
      isStyle(
        this.data[this.i + 2],
        this.data[this.i + 3],
        this.data[this.i + 4],
        this.data[this.i + 5],
        this.data[this.i + 6]
      );
    while(!isEnd()) {
      this.i++;
    }
    let styleContents = this.data.slice(initial, this.i);
    let value = this.cssProcessor && this.cssProcessor(styleContents, this.mapping, this.baseUrl);
    let buffered = Buffer.from(value); // might be string
    buffered.copy(this.replaced, this.j);
    this.j += buffered.length;
    this.addAndProgress(); // <
    this.addAndProgress(); // /
    this.addAndProgress(); // s
    this.addAndProgress(); // t
    this.addAndProgress(); // y
    this.addAndProgress(); // l
    this.addAndProgress(); // e
  }
  getLink(attribute, fromHtml) {
    if (fromHtml.charAt(0) === '#') { // internal hash
      return fromHtml;
    }
    let lastSeenHash = '';
    const resolveLink = link => {
      try {
        let url = new URL(link, this.baseUrl);
        lastSeenHash = url.hash;
        url.hash = '';
        return url.toString();
      } catch (e) {
        return link
      }
    };
    if (attribute === attrs.SRCSET) {
      return fromHtml.split(' ').map(resolveLink).map(part => this.mapping.get(part) || part).join(' ');
    }
    const link = resolveLink(fromHtml);
    let result = this.mapping.get(link) || link;
    if (lastSeenHash) { // srcset can't have hash
      result += lastSeenHash
    }
    return result;
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
    if (attribute === attrs.XLINKHREF) {
      return tagName === 'feimage' || tagName === 'image' || tagName === 'use';
    }
    if (attribute === attrs.STYLE) {
      return true;
    }
    /* istanbul ignore next unreachable */
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
      while (!isWhitespace(this.current()) && !(this.current() === c.ANGLE_CLOSE) && this.lenOk()) {
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
      this.i++; // read the quote
      return this.data.toString('utf8', initial, this.i - 1);
    } // unescaped
    while (!isWhitespace(this.current()) && (this.current() !== c.ANGLE_CLOSE) && this.lenOk()) {
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
        return attrs.DATA;
      }
      return attrs.OTHER;
    }
    if (len === 5) {
      if (isStyle(data[initial], data[initial + 1],data[initial + 2], data[initial + 3], data[initial + 4])) {
        return attrs.STYLE;
      }
      return attrs.OTHER;
    }
    if (len === 6) {
      if (isSrcSet(
        data[initial], data[initial + 1],data[initial + 2], data[initial + 3], data[initial + 4], data[initial + 5]
      )) {
        return attrs.SRCSET;
      }
      return attrs.OTHER;
    }
    if (len === 10) {
      if (isXlinkHref(
        data[initial], 
        data[initial + 1],
        data[initial + 2],
        data[initial + 3],
        data[initial + 4],
        data[initial + 5],
        data[initial + 6],
        data[initial + 7],
        data[initial + 8],
        data[initial + 9])) {
        return attrs.XLINKHREF;
      }
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
  
  /* istanbul ignore next */
  dumpIf(fn = () => true, logger = false) {
    let next100 = this.data.slice(this.i, this.i + 100).toString();
    if (fn(next100)) {
      console.log(new Error().stack);
      console.log(logger ? logger(next100) : next100);
    }
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

module.exports = Generator;
