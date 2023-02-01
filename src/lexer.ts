import { Stream } from "./stream.ts";
import { charData, isCharInCat, UnicodeCategory } from "./unicode.ts";

export enum TokenKind {
  Invalid,
  Whitespace,
  Symbol,
  NumberWholePart,
  NumberFractionalPart,
  NumberExponent,
  StringStart,
  StringEnd,
  StringContent,
  StringInterpolationStart,
  StringInterpolationEnd,
  ParenStart,
  ParenEnd,
  BracketStart,
  BracketEnd,
  Colon,
  Equals,
  Semicolon,
  Comment,
  Dot,
  Ellipsis,
  ThinArrow,
  FatArrow,
  Operator,
  OperatorEquals,
  Hash,
  QuestionMark,
}

const SINGLE_CHAR_TOKENS: Record<string, TokenKind | undefined> = {
  '"': TokenKind.StringStart,
  "(": TokenKind.ParenStart,
  ")": TokenKind.ParenEnd,
  "{": TokenKind.BracketStart,
  "}": TokenKind.BracketEnd,
  ":": TokenKind.Colon,
  "=": TokenKind.Equals,
  ";": TokenKind.Semicolon,
  "#": TokenKind.Hash,
};

const SYMBOL_INITIAL_CAT = [
  UnicodeCategory.LetterUppercase,
  UnicodeCategory.LetterLowercase,
  UnicodeCategory.LetterTitlecase,
  UnicodeCategory.LetterModifier,
  UnicodeCategory.LetterOther,
  UnicodeCategory.PunctuationConnector,
  UnicodeCategory.SymbolOther,
];

const SYMBOL_SUCCESSIVE_CAT = [...SYMBOL_INITIAL_CAT, UnicodeCategory.NumberDecimal, UnicodeCategory.NumberLetter];

const WHITESPACE_PATTERN = /\s/;
const DIGIT_PATTERN = /[0123456789]/;

export interface DocumentPosition {
  line: number;
  column: number;
}

export interface Token extends DocumentPosition {
  kind: TokenKind;
  content: string;
}

export enum LexerState {
  Base,
  Number,
  String,
}

export class Lexer extends Stream<Token> {
  static fromString(string: string): Lexer {
    return Lexer.fromCodePoints(string);
  }

  static fromStringParts(parts: Iterable<string>): Lexer {
    function* codePoints() {
      yield* parts;
    }
    return Lexer.fromCodePoints(codePoints());
  }

  fromResponseBody(body: ReadableStream<Uint8Array>): Lexer {
    async function* codePoints() {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const res = await reader.read();
        if (res.done) return;
        yield* decoder.decode(res.value);
        // todo what if this part ends with a surrogate?
      }
    }
    return Lexer.fromCodePoints(codePoints());
  }

  static fromCodePoints(codePoints: Iterable<string> | Iterator<string> | AsyncIterable<string> | AsyncIterator<string>): Lexer {
    return new Lexer(
      new Stream(codePoints, { line: 1, column: 1 }, (char, { line, column }) => {
        if (char === "\n") return { line: line + 1, column: 1 };
        else return { line: line, column: column + 1 };
      })
    );
  }

  private constructor(private chars: Stream<string, DocumentPosition>) {
    super(
      (async function* (): AsyncIterable<Token> {
        let state = LexerState.Base;
        while (true) {
          const position = chars.status;
          const peek = chars.peek();
          await peek.next();
          const first = peek.last!;
          if (first === Stream.End) return; // EOF
          const firstChar = charData(first);

          // Base state
          if (state === LexerState.Base) {
            // Single-character token
            {
              const kind = SINGLE_CHAR_TOKENS[first];
              if (kind !== undefined) {
                peek.consume();
                yield { kind, content: first, ...position };
                continue;
              }
            }

            // Whitespace
            if (WHITESPACE_PATTERN.test(first)) {
              await peek.nextWhile((item) => WHITESPACE_PATTERN.test(item));

              const content = peek.consume().join("");
              yield { kind: TokenKind.Whitespace, content, ...position };
              continue;
            }

            // Symbol
            if (SYMBOL_INITIAL_CAT.includes(firstChar.category)) {
              await peek.nextWhile((item) => isCharInCat(item, SYMBOL_SUCCESSIVE_CAT));

              const content = peek.consume().join("");
              yield { kind: TokenKind.Symbol, content, ...position };
              continue;
            }

            // Number
            if (DIGIT_PATTERN.test(first)) {
              peek.revoke();
              state = LexerState.Number;
              continue;
            }

            // Dot
            if (first === ".") {
              peek.next();
              // if a digit follows, it's a number!
              if (peek.last !== Stream.End && DIGIT_PATTERN.test(peek.last!)) {
                peek.revoke();
                state = LexerState.Number;
                continue;
              }
              peek.rewind();
              peek.consume();
              yield { kind: TokenKind.Dot, content: first, ...position };
              continue;
            }
          }

          // Number state
          if (state === LexerState.Number) {
            let kind: TokenKind;
            if (first === ".") kind = TokenKind.NumberFractionalPart;
            else if (first === "e" || first === "E") kind = TokenKind.NumberExponent;
            else if (DIGIT_PATTERN.test(first)) kind = TokenKind.NumberWholePart;
            else {
              peek.revoke();
              state = LexerState.Base;
              continue;
            }

            peek.nextWhile((item) => DIGIT_PATTERN.test(item));
            const content = peek.consume().join("");
            yield { kind, content, ...position };
            continue;
          }

          // Invalid
          peek.consume();
          yield { kind: TokenKind.Invalid, content: first, ...position };
        }
      })()
    );
  }
}
