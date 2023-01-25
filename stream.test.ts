import { assertAlmostEquals, assertEquals, assertThrows } from "https://deno.land/std@0.173.0/testing/asserts.ts";
import { Stream } from "./stream.ts";

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
function* fibbonacci() {
  let [a, b] = [1, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

Deno.test("basic functionality", async () => {
  const stream = new Stream([1, 2, 3]);

  assertEquals(await stream.next(), 1);
  assertEquals(await stream.next(), 2);
  assertEquals(await stream.next(), 3);

  assertEquals(await stream.next(), Stream.End);
  assertEquals(await stream.next(), Stream.End);
});

Deno.test("peeking", async (t) => {
  const stream = new Stream("hello world");
  assertEquals(await stream.next(), "h");

  await t.step("revoking a peek", async () => {
    const peek = stream.peek();
    assertEquals(peek.alive, true);
    assertThrows(() => stream.peek(), "There already is an active peek");
    await peek.next();
    assertEquals(peek.items, ["e"]);
    await peek.next(3);
    assertEquals(peek.items, [..."ello"]);
    peek.rewind(2);
    assertEquals(peek.items, ["e", "l"]);
    assertEquals(peek.alive, true);
    peek.revoke();
    assertEquals(peek.alive, false);
  });

  assertEquals(await stream.next(), "e");

  await t.step("consuming a peek", async () => {
    const peek = stream.peek();
    assertEquals(peek.alive, true);
    assertThrows(() => stream.peek(), "There already is an active peek");
    await peek.next(3);
    assertEquals(peek.items, [..."llo"]);
    await peek.rewind();
    assertEquals(peek.items, ["l", "l"]);
    const result = peek.consume();
    assertEquals(result, ["l", "l"]);
    assertEquals(peek.alive, false);
  });

  assertEquals(await stream.next(), "o");

  await t.step("TODO: peek reaching the end of stream", () => {});
  await t.step("TODO: peek nextWhile", () => {});
});

Deno.test("basic status", async () => {
  const stream = new Stream(
    fibbonacci(),
    {
      count: 0,
      sum: 0,
      average: 0,
    },
    (n, { count, sum }) => {
      count += 1;
      sum += n;
      const average = sum / count;
      return { count, sum, average };
    }
  );

  assertEquals(stream.status, { count: 0, sum: 0, average: 0 });
  assertEquals(await stream.next(), 1);
  assertEquals(stream.status, { count: 1, sum: 1, average: 1 });
  assertEquals(await stream.next(), 1);
  assertEquals(stream.status, { count: 2, sum: 2, average: 1 });
  assertEquals(await stream.next(), 2);
  assertEquals(stream.status, { count: 3, sum: 4, average: 4 / 3 });
  assertEquals(await stream.next(), 3);
  assertEquals(stream.status, { count: 4, sum: 7, average: 7 / 4 });
  assertEquals(await stream.next(), 5);
  assertEquals(stream.status, { count: 5, sum: 12, average: 12 / 5 });
  assertEquals(await stream.next(), 8);
  assertEquals(stream.status, { count: 6, sum: 20, average: 10 / 3 });
});

Deno.test("status with peeking", async (t) => {
  const stream = new Stream(fibbonacci(), { last: 1, ratio: 1 }, (n, { last }) => ({ last: n, ratio: n / last }));

  assertEquals(stream.status, { last: 1, ratio: 1 });
  assertEquals(await stream.next(), 1);
  assertEquals(await stream.next(), 1);
  assertEquals(stream.status, { last: 1, ratio: 1 });
  assertEquals(await stream.next(), 2);
  assertEquals(stream.status, { last: 2, ratio: 2 });
  assertEquals(await stream.next(), 3);
  assertEquals(stream.status, { last: 3, ratio: 3 / 2 });

  await t.step("revoking a peek", async () => {
    const peek = stream.peek();
    assertEquals(stream.status, { last: 3, ratio: 3 / 2 });
    assertThrows(() => stream.peek(), "There already is an active peek");
    await peek.next();
    assertEquals(peek.items, [5]);
    assertEquals(stream.status, { last: 3, ratio: 3 / 2 });
    await peek.next(3);
    assertEquals(peek.items, [5, 8, 13, 21]);
    assertEquals(stream.status, { last: 3, ratio: 3 / 2 });
    peek.rewind(2);
    assertEquals(peek.items, [5, 8]);
    assertEquals(stream.status, { last: 3, ratio: 3 / 2 });
    peek.revoke();
    assertEquals(stream.status, { last: 3, ratio: 3 / 2 });
  });

  await t.step("consuming a peek", async () => {
    const peek = stream.peek();
    await peek.next();
    await peek.next(3);
    peek.rewind(2);
    const result = peek.consume();
    assertEquals(result, [5, 8]);
    assertEquals(stream.status, { last: 8, ratio: 8 / 5 });
  });

  await t.step("limit", async () => {
    const peek = stream.peek();
    await peek.next(100);
    peek.consume();

    assertAlmostEquals(stream.status.ratio, GOLDEN_RATIO);
  });
});
