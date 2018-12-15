// the old parser
/* eslint-disable */

const urlParser = require('url');

const escapeRegExp = function (s) {
  return String(s).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
};
const logger = {
  debug() {},
  info() {},
};
const BOUNDARY = 'boundary';
const CHAR_SET = 'charset';
const CONTENT_TYPE = 'Content-Type';
const CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding';
const CONTENT_LOCATION = 'Content-Location';
const FILE_NAME = 'filename=';
const QUOTED_PRINTABLE = 'quoted-printable';
const MAX_FILE_NAME_LENGTH = 9000;


const MAX_FILE_SIZE = 200 * 1000 * 1000;

const QUEUE_TYPES = {
  IMAGE: 0,
  FONT: 1,
  CSS: 2,
  FRAME: 3,
  IMAGE_QUOTED_PRINTABLE: 4,
  GENERAL: 5,
};

function contains(str = '', search = '') {
  return str.includes(search);
}

// DataSection object - handle MHTML section data
const DataSection = function (type, filename, location, contentId, charset, encoding, buffer, baseFileName) {
  this.data = {};
  this.data.type = type;
  this.data.filename = filename;
  this.data.location = location;
  this.data.contentId = contentId;
  this.data.charset = charset;
  this.data.encoding = encoding;
  this.data.data = this.buildBufferContent(buffer, encoding, type);
  this.data.path = this.buildDataPath(location, baseFileName);
};

// Build data from buffer object
DataSection.prototype.buildBufferContent = function (buffer, encoding) {
  logger.debug('Start writing buffer contents.');

  if (encoding.toLowerCase() === 'base64') {
    logger.debug('Base64 encoding detected.');
    return buffer.join('');
  } if (encoding.toLowerCase() === QUOTED_PRINTABLE) { // quoted-printable decoding
    if (buffer && buffer.length > 0 && buffer[0].slice(-1) === '\n') {
      buffer = buffer.slice(1, buffer.length);
    }
    logger.debug('Quoted-Prinatble encoding detected.');
    return buffer.join('').replace(/=([a-fA-F0-9]{2})/g, (whole, relevant) => String.fromCharCode(parseInt(relevant, 16)));
  }
  logger.debug('Unknown Encoding.');

  return buffer.join('');
};

// Build data path for file name
DataSection.prototype.buildDataPath = function (location, baseFileName) {
  const p = urlParser.parse(decodeURIComponent(location).replace(/\s/g, ''), true);
  let path = '';
  if (p.pathname) {
    path = p.pathname.split('/');
    path = path.join('_');
  }

  let query = '';
  if (p.query && Object.keys(p.query).length > 0) {
    for (const name in p.query) {
      if (p.query[name]) {
        const key = name;
        const value = p.query[name];
        query = `_${query}${key}_${value}`;
      }
    }
  }

  let dataPath = (path + query) || '';
  const dataPathSliceLength = dataPath.length - MAX_FILE_NAME_LENGTH;
  dataPath = dataPathSliceLength > 0 ? dataPath.slice(dataPathSliceLength) : dataPath;

  return `${baseFileName}_${dataPath.replace(/(?!\.[^.]+$)\.|[^\w.]+/g, '')}`;
};

// Get data object
DataSection.prototype.getData = function () {
  return this.data;
};

// Get data type QUEUE_TYPES
DataSection.prototype.getDataType = function () {
  const encoding = this.data.encoding.toLowerCase();
  const location = this.data.location;
  const type = this.data.type;
  this.data.fileName = this.data.path;
  this.data.path = `${this.data.path}?realUrl=${location}`;
  if (contains(type, 'image')) {
    if (encoding === 'base64') {
      return QUEUE_TYPES.IMAGE;
    } if (encoding === QUOTED_PRINTABLE) {
      return QUEUE_TYPES.IMAGE_QUOTED_PRINTABLE;
    }
    return QUEUE_TYPES.GENERAL;
  } if (contains(type, 'font') || contains(location, '.woff') || contains(location, '.woff2') || contains(location, '.ttf') || contains(location, '.eot')) {
    return QUEUE_TYPES.FONT;
  } if (contains(type, 'css')) {
    return QUEUE_TYPES.CSS;
  } if (type === 'text/html') {
    const name = this.data.fileName;
    this.data.fileName = name && !name.endsWith('.html') ? `${name}.html` : name;
    this.data.path = `${this.data.fileName}?realUrl=${location}`;
    return QUEUE_TYPES.FRAME;
  }
  return QUEUE_TYPES.GENERAL;
};

const MHTMLParser = function (mhtml, baseFileName) {
  logger.info('Initialized MHTMLParser', { baseFileName });
  this.mhtml = mhtml;
  this.files = [];
  this.baseFileName = baseFileName;
};

// Get MHTML boundary string from boundary attribute
MHTMLParser.prototype.getBoundary = function () {
  return new Promise((resolve, reject) => {
    const lines = this.mhtml.split('\n');
    lines.forEach((line, index) => {
      line = line.trim();
      if (line.startsWith(BOUNDARY)) {
        const c = '"';
        const boundary = line.substring(line.indexOf(c) + 1, line.lastIndexOf(c) - line.indexOf(c) - 1);
        return resolve({ boundary, line: index + 1 });
      }
    });
    reject(new Error('Failed to find boundary attribute'));
  });
};

// Split a line on ": "
MHTMLParser.prototype.getAttribute = function (line) {
  const str = ': ';
  return line.substring(line.indexOf(str) + str.length, line.length).replace(';', '');
};

// Grabs charset from a line
MHTMLParser.prototype.getCharSet = function (line) {
  const t = line.split('=')[1].trim();
  return t.substring(1, t.length - 1);
};

// Split and build data set from MHTML lines
MHTMLParser.prototype.buildDataset = function (boundary, boundaryLine) {
  const that = this;
  return new Promise((resolve) => {
    let lines;
    if (this.mhtml.indexOf('\r\n') > -1) {
      lines = this.mhtml.split('\r\n');
    } else {
      lines = this.mhtml.split('\n');
    }
    let buffer;
    let type = '';
    let encoding = '';
    let location = '';
    let filename = '';
    let contentId = '';
    let charset = '';
    const dataset = {
      framesQ: [],
      fontQ: [],
      imagesQuotedPrintableQ: [],
      imagesQ: [],
      cssQ: [],
      general: [],
    };

    for (let i = boundaryLine; i < lines.length; i++) {
      let line = lines[i];
      if (contains(line, boundary)) { // Check if this is a new section
        if (buffer && buffer.length > 0) { // If this is a new section and the buffer is full, write to dataset
          const dataSection = new DataSection(type, filename, location, contentId, charset, encoding, buffer, this.baseFileName);
          switch (dataSection.getDataType()) {
            case QUEUE_TYPES.IMAGE:
              dataset.imagesQ.push(dataSection.getData());
              break;
            case QUEUE_TYPES.FONT:
              dataset.fontQ.push(dataSection.getData());
              break;
            case QUEUE_TYPES.CSS:
              dataset.cssQ.push(dataSection.getData());
              break;
            case QUEUE_TYPES.FRAME:
              dataset.framesQ.push(dataSection.getData());
              break;
            case QUEUE_TYPES.IMAGE_QUOTED_PRINTABLE:
              dataset.imagesQuotedPrintableQ.push(dataSection.getData());
              break;
            case QUEUE_TYPES.GENERAL:
              dataset.general.push(dataSection.getData());
              break;
          }

          buffer = null;
          logger.debug('Wrote Buffer Content and reset buffer.');
        }
        buffer = [];
      } else if (line.startsWith(CONTENT_TYPE)) {
        type = that.getAttribute(line.trim());
        logger.debug(`Got content type (${type}).`);
      } else if (line.startsWith(CHAR_SET)) {
        charset = that.getCharSet(line.trim());
        logger.debug(`Got charset (${charset}).`);
      } else if (line.startsWith(CONTENT_TRANSFER_ENCODING)) {
        encoding = that.getAttribute(line.trim());
        logger.debug(`Got encoding (${encoding}).`);
      } else if (line.startsWith(CONTENT_LOCATION)) {
        location = line.trim().substring(line.indexOf(':') + 1).trim();
        logger.debug(`Got location (${location}).`);
      } else if (line.startsWith(FILE_NAME)) {
        const c = '"';
        filename = line.substring(line.indexOf(c) + 1, line.lastIndexOf(c) - line.indexOf(c) - 1);
        logger.debug(`Got filename (${filename}).`);
      } else if (line.startsWith('Content-ID')) {
        contentId = that.getAttribute(line.trim());
        contentId = contentId.substring(1);
        contentId = contentId.substring(0, contentId.length - 1);
        logger.debug(`Got content id (${contentId}).`);
      } else if (line.startsWith('Content-Disposition') || line.startsWith('name=')) {
        // We don't need this stuff; Skip lines
        continue;
      } else if (buffer) {
        if (line.slice(-1) === '=' && encoding.toLowerCase() === QUOTED_PRINTABLE) {
          const tbuffer = [];
          tbuffer.push(line.slice(0, -1));
          var tline;
          for (let j = i + 1; j < lines.length; j++) {
            tline = lines[j];
            if (tline.slice(-1) === '=') {
              tbuffer.push(tline.slice(0, -1));
            } else {
              i = j;
              break;
            }
          }
          tbuffer.push(tline);
          line = tbuffer.join('');
        }
        if (encoding.toLowerCase() === 'base64') {
          buffer.push(line);
        } else {
          buffer.push(`${line}\n`);
        }
      }
    }
    resolve(dataset);
  });
};

// Get file path name from data section location for regEx replaces
MHTMLParser.prototype.getFilePathname = function (location) {
  const urip = urlParser.parse(location);
  const urisearch = urip.search;
  const fullpathname = urip.pathname.split('/');
  const retPath = (`${fullpathname[fullpathname.length - 2]}/` || '') + fullpathname[fullpathname.length - 1] + (urisearch || '');
  return retPath.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

function newRegExp(patten, falgs) {
  try {
    return new RegExp(patten, falgs);
  } catch (err) {
    logger.info('failed to create regex');
    return new RegExp(escapeRegExp(patten), falgs);
  }
}

MHTMLParser.prototype.replaceFontAndImages = function (data, dataset) {
  const pathname = this.getFilePathname(data.location);
  const re = newRegExp(data.location, 'mgi');

  const regExRelativeUrl = newRegExp(`url\(([^\)]*${pathname}[^\)]*)\)`, 'g');
  const regExRelativeUrlValue = `url('${data.path}'`;

  const regExUrl = newRegExp(`url\(([^\)]*${data.location}[^\)]*)\)`, 'g');
  const regExUrlValue = `url('${data.path}'`;

  const regExRelativeSrc = newRegExp(`src="([^"]*${pathname}[^"]*)"`, 'mgi');
  const regExRelativeSrcValue = `src="${data.path}"`;

  for (let i = 0; i < dataset.cssQ.length; i++) {
    if (Buffer.byteLength(dataset.cssQ[i].data) > MAX_FILE_SIZE) {
      logger.warn(`drop replace css too big bigger than 2MB ${this.baseFileName}`);
      continue;
    }
    dataset.cssQ[i].data = dataset.cssQ[i].data.replace(re, data.path);
    dataset.cssQ[i].data = dataset.cssQ[i].data.replace(regExRelativeUrl, regExRelativeUrlValue);
    dataset.cssQ[i].data = dataset.cssQ[i].data.replace(regExUrl, regExUrlValue);
    dataset.cssQ[i].data = dataset.cssQ[i].data.replace(regExRelativeSrc, regExRelativeSrcValue);
  }

  for (let j = 0; j < dataset.framesQ.length; j++) {
    if (Buffer.byteLength(dataset.framesQ[j].data) > MAX_FILE_SIZE) {
      logger.warn(`drop replace frame too big bigger than 2MB ${this.baseFileName}`);
      continue;
    }
    dataset.framesQ[j].data = dataset.framesQ[j].data.replace(re, data.path);
    dataset.framesQ[j].data = dataset.framesQ[j].data.replace(regExRelativeUrl, regExRelativeUrlValue);
    dataset.framesQ[j].data = dataset.framesQ[j].data.replace(regExUrl, regExUrlValue);
    dataset.framesQ[j].data = dataset.framesQ[j].data.replace(regExRelativeSrc, regExRelativeSrcValue);
  }
};

MHTMLParser.prototype.buildImageQ = function (dataset) {
  logger.info(`start buildImageQ ${this.baseFileName}`);
  const start = new Date().getTime();
  const MAX_REPLACE_ITERATIONS = 20;
  const numOfIterations = dataset.imagesQ.length > MAX_REPLACE_ITERATIONS ? MAX_REPLACE_ITERATIONS : dataset.imagesQ.length;
  for (let i = 0; i < numOfIterations; i++) {
    const data = dataset.imagesQ[i];
    logger.debug(`Overwriting HTML with image: ${data.location}`);

    this.replaceFontAndImages(data, dataset);

    this.files.push({
      fileName: data.fileName, data: data.data, type: data.type, encoding: 'base64',
    });
  }
  const end = new Date().getTime();
  const time = end - start;
  logger.info(`buildImageQ - ${this.baseFileName} execution time: ${time}`);
};

MHTMLParser.prototype.buildFontQ = function (dataset) {
  logger.info(`start buildFontQ ${this.baseFileName}`);
  const start = new Date().getTime();
  dataset.fontQ.forEach((data) => {
    logger.debug(`Overwriting HTML with font: ${data.location}`);

    this.replaceFontAndImages(data, dataset);

    this.files.push({
      fileName: data.fileName, data: data.data, type: data.type, encoding: 'base64',
    });
  });
  const end = new Date().getTime();
  const time = end - start;
  logger.info(`buildFontQ - ${this.baseFileName} execution time: ${time}`);
};

MHTMLParser.prototype.buildImagesQuotedPrintableQ = function (dataset) {
  logger.info(`start buildImagesQuotedPrintableQ ${this.baseFileName}`);
  const start = new Date().getTime();
  dataset.imagesQuotedPrintableQ.forEach((data) => {
    logger.debug(`Overwriting HTML with image quoted printable: ${data.location}`);

    this.replaceFontAndImages(data, dataset);

    this.files.push({
      fileName: data.fileName, data: data.data, type: data.type, encoding: 'text',
    });
  });
  const end = new Date().getTime();
  const time = end - start;
  logger.info(`buildImagesQuotedPrintableQ - ${this.baseFileName} execution time: ${time}`);
};

MHTMLParser.prototype.buildCssQ = function (dataset) {
  logger.info(`start buildCssQ ${this.baseFileName}`);
  const start = new Date().getTime();
  dataset.cssQ.forEach((data) => {
    logger.debug(`Replacing HTML with css style: ${data.location}`);
    const pathname = this.getFilePathname(data.location);
    const re = newRegExp(`href="([^"]*${pathname}[^"]*)"`, 'g');
    const cssHref = `href="${data.path}"`;

    const regExRelativeUrl = newRegExp(`url\(([^\)]*${pathname}[^\)]*)\)`, 'g');
    const regExRelativeUrlValue = `url('${data.path}'`;

    const regExUrl = newRegExp(`url\(([^\)]*${data.location}[^\)]*)\)`, 'g');
    const regExUrlValue = `url('${data.path}'`;

    dataset.framesQ.forEach((frame) => {
      if (Buffer.byteLength(frame.data) > MAX_FILE_SIZE) {
        logger.warn(`drop replace css inside frame too big bigger than 2MB ${this.baseFileName}`);
        return;
      }
      frame.data = frame.data.replace(re, cssHref);
    });

    for (let i = 0; i < dataset.cssQ.length; i++) {
      if (Buffer.byteLength(dataset.cssQ[i].data) > MAX_FILE_SIZE) {
        logger.warn(`drop replace css inside css too big bigger than 2MB ${this.baseFileName}`);
        continue;
      }
      dataset.cssQ[i].data = dataset.cssQ[i].data.replace(regExRelativeUrl, regExRelativeUrlValue);
      dataset.cssQ[i].data = dataset.cssQ[i].data.replace(regExUrl, regExUrlValue);
    }

    this.files.push({
      fileName: data.fileName, data: data.data, type: data.type, encoding: 'text',
    });
  });
  const end = new Date().getTime();
  const time = end - start;
  logger.info(`buildCssQ - ${this.baseFileName} execution time: ${time}`);
};

MHTMLParser.prototype.buildFrameQ = function (dataset) {
  logger.info(`start buildFrameQ ${this.baseFileName}`);
  const start = new Date().getTime();
  for (let i = 0; i < dataset.framesQ.length; i++) {
    const frameData = dataset.framesQ[i];

    if (Buffer.byteLength(frameData.data) > MAX_FILE_SIZE) {
      logger.warn(`drop replace frame inside frame too big bigger than 2MB ${this.baseFileName}`);
      continue;
    }

    for (let j = 0; j < dataset.framesQ.length; j++) {
      const frameData2 = dataset.framesQ[j];
      const re = newRegExp(`cid:${frameData2.contentId}`, 'mgi');
      frameData.data = frameData.data.replace(re, frameData2.path);
    }

    if (i !== 0) {
      this.files.push({
        fileName: frameData.fileName,
        data: frameData.data,
        type: frameData.type,
        encoding: 'text',
      });
    }
  }
  const end = new Date().getTime();
  const time = end - start;
  logger.info(`buildFrameQ - ${this.baseFileName} execution time: ${time}`);
};

// Build html from data section arrays
MHTMLParser.prototype.buildHtml = function (dataset) {
  const start = new Date().getTime();
  logger.info(`start buildHtml ${this.baseFileName}`);
  this.buildImageQ(dataset);
  this.buildFontQ(dataset);
  this.buildImagesQuotedPrintableQ(dataset);
  this.buildCssQ(dataset);
  this.buildFrameQ(dataset);

  let body = (dataset.framesQ[0] && dataset.framesQ[0].data) || '';
  logger.debug('Writing HTML Text');

  // Remove base tag
  const regExBase = newRegExp('<base.*?">', 'gi');
  body = body.replace(regExBase, '');

  this.files.push({
    fileName: `${this.baseFileName}.html`, data: body, type: 'text/html', encoding: 'text',
  });

  const end = new Date().getTime();
  const time = end - start;
  logger.info(`buildHtml - ${this.baseFileName} execution time: ${time}`);

  return Promise.resolve(this.files);
};

// Get HTML text from MHTML string
MHTMLParser.prototype.getHTMLText = function () {
  logger.info(`Starting getHTMLText ${this.baseFileName}`);
  return this.getBoundary()
    .then((boundary) => {
      logger.info(`Found boundary ${this.baseFileName}`);
      return this.buildDataset(boundary.boundary, boundary.line);
    })
    .then((dataset) => {
      this.mhtml = null;
      logger.info(`Build HTML ${this.baseFileName}`);
      return this.buildHtml(dataset);
    });
};

module.exports = MHTMLParser;
