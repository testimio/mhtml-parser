const filenamify = require('filenamify');
const bodyDecoder = require('./decoder');
const linkReplacer = require('./link-replacer');

const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);
module.exports = class Parser {
  constructor(config = {}) {
    this.maxFileSize = config.maxFileSize || 50 * 1000 * 1000;
    this.rewriteFn = config.rewriteFn || filenamify;
    this.gotString = false;
  }

  parse(file) { // file is contents
    this.gotString = false;
    if (!Buffer.isBuffer(file)) {
      file = Buffer.from(file);
      this.gotString = true;
    }
    const endOfHeaders = Parser.findDoubleCrLf(file);
    const header = file.slice(0, endOfHeaders).toString();
    const separatorMatch = /boundary="(.*)"/g.exec(header);
    if (!separatorMatch) {
      throw new Error('No separator');
    }
    const separator = `--${separatorMatch[1]}`;
    this.parts = Parser.splitByBoundary(file, separator, endOfHeaders + 1, this.maxFileSize)
      .map(Parser.parsePart);
    return this;
  }

  static splitByBoundary(file, separator, fromPosition, maxFileSize) {
    let index;
    const sepLen = separator.length;
    const parts = [];
    while ((index = file.indexOf(separator, fromPosition + 1)) !== -1) {
      if (index - fromPosition > 12) { // push non empty parts added sometimes
        if (index - fromPosition > maxFileSize) {
          fromPosition = index;
          continue; // ignore too big chunks
        }
        const part = file.slice(fromPosition + sepLen, index);
        parts.push(part);
      }
      fromPosition = index;
    }
    return parts;
  }

  static findDoubleCrLf(file) {
    for (let i = 0, len = file.length; i < len; i++) {
      if (file[i] !== CR && file[i] !== LF) {
        continue;
      }
      if (file[i] === CR && file[i + 1] === LF) {
        // \r\n
        if (file[i + 2] === CR && file[i + 3] === LF) {
          return i;
        }
        continue;
      }
      if (file[i] === LF && file[i + 1] === LF) {
        return i;
      }
    }
    return -1;
  }

  rewrite() {
    const entries = this.parts
      .filter(part => part.location)
      .map(part => [part.location.trim(), this.rewriteFn(part.location).trim()]);
    const rewriteMap = new Map(entries);
    for (const part of this.parts.filter(x => x.id)) {
      rewriteMap.set(`cid:${part.id}`, this.rewriteFn(part.location || part.id.trim()));
    }
    for (const part of this.parts) {
      const replacer = ({
        'text/html': linkReplacer.html,
        'text/css': linkReplacer.css,
        'image/svg+xml': linkReplacer.svg,
      })[part.type] || (body => body);
      part.body = replacer(part.body, rewriteMap, part.location);
    }
    return this;
  }

  spit() {
    return this.parts.map(part => ({
      filename: this.rewriteFn(part.location || part.id),
      content: this.gotString ? part.body.toString() : part.body,
      type: part.type,
    }));
  }

  static parsePart(part) {
    const headerEnd = Parser.findDoubleCrLf(part);
    const headerPart = part.slice(0, headerEnd).toString().trim();
    let startBody = headerEnd + 1;
    while ((part[startBody] === CR || part[startBody] === LF)
     && (startBody < headerEnd + 10)) { // remove some initial whitespace
      startBody++;
    }
    const body = part.slice(startBody);
    const headers = new Map(headerPart.split(/\r?\n/g)
      .map(header => header.split(': '))
      .map(([key, value]) => [key.toLowerCase(), value]));
    return {
      location: headers.get('content-location'),
      id: Parser.parseContentId(headers.get('content-id')),
      type: headers.get('content-type'),
      encoding: (headers.get('content-transfer-encoding') || '').toLowerCase(),
      body: Parser.parseBody(headers.get('content-transfer-encoding'), body),
    };
  }

  static parseContentId(contentId) {
    if (!contentId) {
      return undefined;
    }
    return contentId.substring(1, contentId.length - 1);
  }

  static parseBody(encoding, body) {
    return bodyDecoder(encoding, body);
  }
};
