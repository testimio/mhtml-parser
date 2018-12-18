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
const D = 'D'.charCodeAt(0);
const THREE = '3'.charCodeAt(0);

const hex = Buffer.alloc(256, -1);
for (let i = 0; i <= 9; i++) hex['0'.charCodeAt(0) + i] = i;
for (let i = 0xa; i <= 0xf; i++) hex['A'.charCodeAt(0) + i - 0xa] = i;

function convertQuotedPrintable(body) {
  const len = body.length;
  const decoded = Buffer.alloc(len); // at most this big
  let j = 0;
  for (let i = 0; i < len; i++) {
    while (i < len && (decoded[j++] = body[i++]) !== EQUALS);
    if (i >= len) break;
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
    const upperTranslated = hex[upper];
    const lowerTranslated = hex[lower];
    if ((upperTranslated | lowerTranslated) & 128) {
      // invalid seq
      decoded[j++] = upper;
      decoded[j++] = lower;
      continue;
    }
    const shifted = upperTranslated << 4;
    decoded[j - 1] = shifted | lowerTranslated;
  }
  return decoded.slice(0, j);
}
