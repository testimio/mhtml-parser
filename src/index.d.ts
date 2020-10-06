declare module 'fast-mhtml' {
  export interface IParserConfig {
    rewriteFn?: (url: string) => string;
    maxFileSize?: number
  }
  export interface IFileResult {
    content: Buffer | string;
    type: string;
    filename: string;
  }
  export class Parser {
    constructor(config?: IParserConfig);
    parse(contents: Buffer | string): this;
    rewrite(): this;
    spit(): IFileResult[];
  }
  export class Converter {
    static serve(port?: number): void;
    static convert(filename: string): Promise<void>;
  }
}
