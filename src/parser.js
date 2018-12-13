const filenamify = require('filenamify');
const bodyDecoder = require('./decoder');
const linkReplacer = require('./link-replacer');

module.exports = class Parser {
  constructor(config = {}) {
    this.maxFileSize = config.maxFileSize || 50 * 1000 * 1000;
    this.rewriteFn = config.rewriteFn || filenamify;
  }

  parse(file) { // file is contents
    if (Buffer.isBuffer(file)) {
      file = file.toString();
    }
    const endOfHeaders = file.search(/\r?\n\r?\n/);
    const header = file.slice(0, endOfHeaders);
    const separatorMatch = /boundary="(.*)"/g.exec(header);
    if (!separatorMatch) {
      throw new Error('No separator');
    }
    const separator = separatorMatch[1];
    const parts = file.split(new RegExp(`.*${separator}.*`)).slice(1).filter(x => x.length < this.maxFileSize && x.trim()).map(Parser.parsePart);
    this.parts = parts;
    return this;
  }

  rewrite() {
    const entries = this.parts.map(part => [part.location, this.rewriteFn(part.location)]);
    const rewriteMap = new Map(entries);
    for (const part of this.parts.filter(x => x.id)) {
      rewriteMap.set(`cid:${part.id}`, this.rewriteFn(part.location));
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
    return this.parts.map(({ location, body, type }) => ({
      filename: this.rewriteFn(location),
      content: body,
      type,
    }));
  }

  static parsePart(part) {
    const headerEnd = part.search(/\r?\n\r?\n/);
    const headerPart = part.slice(0, headerEnd);
    const body = part.slice(headerEnd + 1);
    const headers = new Map(headerPart.split(/\r?\n/g).map(header => header.split(': ')).map(([key, value]) => [key.toLowerCase(), value]));
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
