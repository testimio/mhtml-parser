'use strict';

const QUOTED_PRINTABLE_RE = /=([a-fA-F0-9]{2})/g;

module.exports = (encoding, body) => {
  switch (encoding) {
    case 'base64':
      return Buffer.from(body, 'base64').toString('utf8');
    case 'quoted-printable':
      return body.replace(QUOTED_PRINTABLE_RE, (whole, relevant) => String.fromCharCode(parseInt(relevant, 16)));
    case '8bit':
    case '7bit':
    case 'binary':
      return body; // already after a Buffer.toString here
    default:
      throw new Error(`Unknown encoding ${encoding}body: ${body}`);
  }
};
