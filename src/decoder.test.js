const { expect } = require('chai');
const decoder = require('./decoder');

describe('decoding', () => {
  it('decodes base64', () => {
    expect(decoder('base64', Buffer.from(Buffer.from('Hello').toString('base64'))).toString()).to.equal('Hello');
  });
  it('decodes quoted printable', () => {
    expect(
      decoder('quoted-printable',
        Buffer.from('Hello =3D World')).toString()
    ).to.equal('Hello = World');
  });

  it('decodes quoted printable removing newlines', () => {
    expect(
      decoder('quoted-printable',
        Buffer.from('Hello =\nWorld')).toString()
    ).to.equal('Hello World'); expect(
      decoder('quoted-printable',
        Buffer.from('Hello =\r\nWorld')).toString()
    ).to.equal('Hello World');
  });

  it('decodes quoted printable ignoring invalid seqs', () => {
    expect(
      decoder('quoted-printable',
        Buffer.from('Hello =World')).toString()
    ).to.equal('Hello =World');
  });

  it('decodes quoted printable non = chars', () => {
    expect(
      decoder('quoted-printable',
        Buffer.from('Hello =3E World')).toString()
    ).to.equal('Hello > World');
  });

  it('decodes quoted printable non = nums', () => {
    expect(
      decoder('quoted-printable',
        Buffer.from('Hello =66 World')).toString()
    ).to.equal('Hello f World');
  });

  it('decodes quoted printable on invalid lower sequences', () => {
    expect(
      decoder('quoted-printable',
        Buffer.from('Hello =6K World')).toString()
    ).to.equal('Hello =6K World');
  });

  it('decodes ignored encodings', () => {
    expect(decoder('7bit', Buffer.from('Hello')).toString()).to.equal('Hello');
    expect(decoder('8bit', Buffer.from('Hello')).toString()).to.equal('Hello');
    expect(decoder('binary', Buffer.from('Hello')).toString()).to.equal('Hello');
  });

  it('decodes quoted printable at end of input', () => {
    expect(
      decoder('quoted-printable',
        Buffer.from('Hello World =3E')).toString()
    ).to.equal('Hello World >');
  });

  it('throws on unknown encodings', () => {
    expect(() => decoder('kaka', Buffer.from('hello'))).to.throw();
  });
});
