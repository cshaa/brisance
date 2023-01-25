import unicode from "https://deno.land/x/unicode/mod.ts";
import { yeet } from "./utils.ts";

export function charData(char: string): UnicodeItem {
  const result = unicode[char.codePointAt(0)!];
  const { category, class: combiningClass, mirrored } = result;

  return {
    ...result,
    category: category as UnicodeCategory,
    class: +combiningClass,
    mirrored: mirrored === "Y" ? true : mirrored === "N" ? false : yeet("Unknown bidi_mirorred value"),
  };
}

export function isCharInCat(char: string, cat: UnicodeCategory | UnicodeCategory[]): boolean {
  if (!Array.isArray(cat)) cat = [cat];
  return cat.includes(charData(char).category);
}

export interface UnicodeItem {
  value: string;
  name: string;
  category: UnicodeCategory;
  class: UnicodeCombiningClass | (number & UnicodeCombiningClassOther);
  bidirectional_category: string;
  mapping: string;
  decimal_digit_value: string;
  digit_value: string;
  numeric_value: string;
  mirrored: boolean;
  unicode_name: string;
  comment: string;
  uppercase_mapping: string;
  lowercase_mapping: string;
  titlecase_mapping: string;
  symbol: string;
}

export enum UnicodeCategory {
  LetterUppercase = "Lu",
  LetterLowercase = "Ll",
  LetterTitlecase = "Lt",
  LetterModifier = "Lm",
  LetterOther = "Lo",
  MarkNonspacing = "Mn",
  MarkCombining = "Mc",
  MarkEnclosing = "Me",
  NumberDecimal = "Nd",
  NumberLetter = "Nl",
  NumberOther = "No",
  PunctuationConnector = "Pc",
  PunctuationDash = "Pd",
  PunctuationOpen = "Ps",
  PunctuationClose = "Pe",
  PunctuationInitialQuote = "Pi",
  PunctuationFinalQuote = "Pf",
  PunctuationOther = "Po",
  SymbolMath = "Sm",
  SymbolCurrency = "Sc",
  SymbolModifier = "Sk",
  SymbolOther = "So",
  SeparatorSpace = "Zs",
  SeparatorLine = "Zl",
  SeparatorParagraph = "Zp",
  OtherControl = "Cc",
  OtherFormat = "Cf",
  OtherSurrogate = "Cs",
  OtherPrivateUse = "Co",
}

export enum UnicodeCombiningClass {
  Spacing = 0,
  Overlay = 1,
  HanReading = 6,
  Nukta = 7,
  KanaVoicingMark = 8,
  Virama = 9,
  AttachBottomLeft = 200,
  AttachBottom = 202,
  AttachBottomRight = 204,
  AttachLeft = 208,
  AttachRight = 210,
  AttachTopLeft = 212,
  AttachTop = 214,
  AttachTopRight = 216,
  AdjacentBottomLeft = 218,
  AdjacentBottom = 220,
  AdjacentBottomRight = 222,
  AdjacentLeft = 224,
  AdjacentRight = 226,
  AdjacentTopLeft = 228,
  AdjacentTop = 230,
  AdjacentTopRight = 232,
  AdjacentBottomDouble = 233,
  AdjacentTopDouble = 234,
  IotaSubscript = 240,
}
const _other = Symbol();
type UnicodeCombiningClassOther = { [_other]: any };
