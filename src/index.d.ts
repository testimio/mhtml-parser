declare module 'fast-mhtml' {
  interface IParserConfig {
    rewriteFn?: (url: string) => string;
    maxFileSize?: number
  }
  interface IFileResult {
    contents: Buffer | string;
    type: string;
    filename: string;
  }
  export class Parser {
    constructor(config?: IParserConfig);
    parse(contents: Buffer | string);
    rewrite();
    spit(): IFileResult[];
  }
  export class Converter {
    static serve();
    static convert(filename: string);
  }
}
