import { Token } from "./lexer.ts";

export enum TokenNodeKind {
  Invalid,
  Symbol,
  Number,
  String,
  Paren,
  Bracket,
  Colon,
  Equals,
  Semicolon,
  Dot,
  Ellipsis,
  ThinArrow,
  FatArrow,
  Operator,
  OperatorEquals,
  Hash,
  QuestionMark,
}

export interface TokenNode {
  kind: TokenNodeKind;
  children: Token[];
  leadingTrivia: Token[];
  trailingTrivia: Token[];
}
