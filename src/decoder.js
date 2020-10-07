const decodeBase64 = (() => {
  try {
    // eslint-disable-next-line
    return require('64').decode;
  } catch (e) {
    return data => Buffer.from(data.toString(), 'base64');
  }
})();

module.exports = (encoding, body) => {
  switch (encoding) {
    case 'base64':
      return decodeBase64(body);
    case 'quoted-printable':
      return convertQuotedPrintable(body);
    case '8bit':
    case '7bit':
    case 'binary':
      return body;
    default:
      throw new Error(`Unknown encoding ${encoding}body: ${body}`);
  }
};

const EQUALS = '='.charCodeAt(0);
const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);
const D = 'D'.charCodeAt(0);
const THREE = '3'.charCodeAt(0);

const translate = (() => {
  let str = 'switch (c) {\n';
  for (let i = 0; i <= 9; i++) str += `\tcase ${'0'.charCodeAt(0) + i}: return ${i};\n`;
  for (let i = 0xA; i <= 0xF; i++) str += `\tcase ${'A'.charCodeAt(0) + i - 0xA}: return ${i};\n`;
  str += 'default: return -1;\n';
  str += '};\n';
  /* eslint-disable no-new-func */
  return Function('c', str);
})();

function convertQuotedPrintable(body) {
  const len = body.length;
  const decoded = Buffer.alloc(len); // at most this big
  let j = 0;
  const runTo = len - 3;
  for (let i = 0; i < runTo; i++) {
    while (i < runTo && (decoded[j++] = body[i++]) !== EQUALS);
    if (i >= runTo) break;
    // We are dealing with a '=xx' sequence.
    const upper = body[i];
    const lower = body[++i];

    // fast path for =3D
    if (upper === THREE && lower === D) {
      continue;
    }
    if (upper === CR && lower === LF) {
      j--;
      continue;
    }
    if (upper === LF) {
      // windows chrome does invalid encoding with \n and not \r\n
      i--;
      j--;
      continue;
    }
    const upperTranslated = translate(upper);
    const lowerTranslated = translate(lower);
    if ((upperTranslated | lowerTranslated) & 128) {
      // invalid seq
      decoded[j++] = upper;
      decoded[j++] = lower;
      continue;
    }
    const shifted = upperTranslated << 4;
    decoded[j - 1] = shifted | lowerTranslated;
  }
  for (let i = runTo; i < len; i++) {
    decoded[j++] = body[i];
  }
  return decoded.slice(0, j);
}
