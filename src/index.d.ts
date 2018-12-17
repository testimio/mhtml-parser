declare module 'fast-mhtml' {
  type ParserConfig = {
    rewriteFn: (url: String) => String;
    maxFileSize: Number
  };
  type FileResult = {
    contents: Buffer | string;
    type: string;
    filename: string;
  };
  export class Parser {
    constructor(config: ParserConfig);
    parse(contents: Buffer | String);
    rewrite();
    spit(): FileResult[];
  }
  export class Converter {
    static serve();
    static convert(filename: string);
  }
}