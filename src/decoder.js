const quotedPrintable = require('quoted-printable');

module.exports = (encoding, body) => {
  switch (encoding) {
    case 'base64':
      return Buffer.from(body, 'base64').toString('utf8');
    case 'quoted-printable':
      return quotedPrintable.decode(body);
    case '8bit':
    case '7bit':
    case 'binary':
      return str; // already after a Buffer.toString here
    default:
      throw new Error(`Unknown encoding ${encoding}body: ${body}`);
  }
};
