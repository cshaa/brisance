import { assertEquals } from "https://deno.land/std@0.173.0/testing/asserts.ts";
import { Lexer, TokenKind } from "./lexer.ts";

Deno.test("declaration", async () => {
  const lexer = Lexer.fromString("let foo: i32 = 5;");
  assertEquals(await lexer.next(), { kind: TokenKind.Symbol, content: "let", line: 1, column: 1 });
  assertEquals(await lexer.next(), { kind: TokenKind.Whitespace, content: " ", line: 1, column: 4 });
  assertEquals(await lexer.next(), { kind: TokenKind.Symbol, content: "foo", line: 1, column: 5 });
  assertEquals(await lexer.next(), { kind: TokenKind.Colon, content: ":", line: 1, column: 8 });
  assertEquals(await lexer.next(), { kind: TokenKind.Whitespace, content: " ", line: 1, column: 9 });
  assertEquals(await lexer.next(), { kind: TokenKind.Symbol, content: "i32", line: 1, column: 10 });
  assertEquals(await lexer.next(), { kind: TokenKind.Whitespace, content: " ", line: 1, column: 13 });
  assertEquals(await lexer.next(), { kind: TokenKind.Equals, content: "=", line: 1, column: 14 });
  assertEquals(await lexer.next(), { kind: TokenKind.Whitespace, content: " ", line: 1, column: 15 });
  assertEquals(await lexer.next(), { kind: TokenKind.NumberWholePart, content: "5", line: 1, column: 16 });
  assertEquals(await lexer.next(), { kind: TokenKind.Semicolon, content: ";", line: 1, column: 17 });
});
