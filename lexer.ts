import { Stream } from "./stream.ts";

export enum TokenKind {
  whitespace,
  symbol,
  stringStart,
  stringEnd,
  stringContent,
  stringInterpolationStart,
  stringInterpolationEnd,
  parenStart,
  parenEnd,
  bracketStart,
  bracketEnd,
  operatorSymbol,
  colon,
  equals,
  semicolon,
  comment,
  numeric,
  dot,
  ellipsis,
  thinArrow,
  fatArrow,
  operator,
  operatorEquals,
  label,
  questionMark,
}

export interface Token {
  kind: TokenKind;
  line: number;
  column: number;
  content: string;
}

export class Lexer extends Stream<Token> {
  constructor(private chars: Stream<string>) {
    super(
      (function* (): Iterable<Token> {
        // todo
      })()
    );
  }
}
