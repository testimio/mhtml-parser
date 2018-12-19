module.exports = (encoding, body) => {
  switch (encoding) {
    case 'base64':
      return Buffer.from(body.toString(), 'base64'); // ew on the toString, TODO figure this out
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
const ZERO = '0'.charCodeAt(0);
const A = 'A'.charCodeAt(0);
const D = 'D'.charCodeAt(0);
const THREE = '3'.charCodeAt(0);

const translate = (() => {
  let str = 'switch (c) {\n'
  for (let i = 0; i <= 9; i++) str += `\tcase ${'0'.charCodeAt(0) + i}: return ${i};\n`;
  for (let i = 0xA; i <= 0xF; i++) str += `\tcase ${'A'.charCodeAt(0) + i - 0xA}: return ${i};\n`;
  str += 'default: return 1000;\n';
  str += '};\n'
  return Function('c', str);
})();

function convertQuotedPrintable(body) {
  const len = body.length;
  const decoded = Buffer.alloc(len); // at most this big
  const runTo = len - 3;
  let j = 0;
  for (let i = 0; i < runTo; i++) {
    while ((decoded[j++] = body[i++]) !== EQUALS && i < runTo);
    if (i >= runTo) {
      break;
    }
    // We are dealing with a '=xx' sequence.
    const upper = body[++i] | 0;
    const lower = body[++i] | 0;

    // fast path for =3D
    if (upper === THREE && lower === D) {
      continue;
    }
    if (upper === CR && lower === LF) {
      j--;
      continue;
    }
    if (upper === LF) { // windows chrome does invalid encoding with \n and not \r\n
      i--;
      j--;
      continue;
    }
    let upperTranslated = translate(upper);
    let lowerTranslated = translate(lower);
    
    if ((upperTranslated | lowerTranslated) & 128) { // invalid seq
      decoded[j++] = upper;
      decoded[j++] = lower;
      continue;
    }

    const shifted = upperTranslated << 4;
    decoded[j - 1] = (shifted | lowerTranslated);
  }
  for (let i = runTo; i < len; i++) {
    decoded[j++] = body[i];
  }
  return decoded.slice(0, j);
}
