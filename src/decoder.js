

module.exports = (encoding, body) => {
  switch (encoding) {
    case 'base64':
      return Buffer.from(body, 'base64').toString('utf8');
    case 'quoted-printable':
      return body.replace(/=([a-fA-F0-9]{2})/g, (whole, relevant) => String.fromCharCode(parseInt(relevant, 16)));
    case '8bit':
    case '7bit':
    case 'binary':
      return body; // already after a Buffer.toString here
    default:
      throw new Error(`Unknown encoding ${encoding}body: ${body}`);
  }
};
