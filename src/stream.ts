const isIterable = <T>(value: T): value is Extract<T, Iterable<any>> => typeof (value as any)?.[Symbol.iterator] === "function";
const isAsyncIterable = <T>(value: T): value is Extract<T, AsyncIterable<any>> =>
  typeof (value as any)?.[Symbol.asyncIterator] === "function";
const withoutStreamEnd = <T>(arr: Array<T | Stream.End>): T[] => arr.filter((x): x is T => x !== Stream.End);

/**
 * A user-friendly wrapper around AsyncIterator that allows
 * for status updates, peek-forwards and rewind-backs.
 */
export class Stream<T, S = undefined> implements AsyncIterable<T> {
  private iterator: Iterator<T> | AsyncIterator<T>;
  private buffer: T[] = [];
  private currentPeek: Peek<T> | undefined;
  private _status: S | undefined;
  get status(): S {
    return this._status!;
  }
  async *[Symbol.asyncIterator](): AsyncIterator<T, Stream.End> {
    while (true) {
      const res = await this.next();
      if (res === Stream.End) return Stream.End;
      else yield res;
    }
  }

  constructor(iterator: Iterator<T> | Iterable<T> | AsyncIterator<T> | AsyncIterable<T>);
  constructor(
    iterator: Iterator<T> | Iterable<T> | AsyncIterator<T> | AsyncIterable<T>,
    defaultStatus: S,
    statusUpdater: (newValue: T, previousStatus: S) => S
  );

  constructor(
    iterator: Iterator<T> | Iterable<T> | AsyncIterator<T> | AsyncIterable<T>,
    defaultStatus?: S,
    private statusUpdater?: (newValue: T, previousStatus: S) => S
  ) {
    if (isIterable(iterator)) iterator = iterator[Symbol.iterator]();
    if (isAsyncIterable(iterator)) iterator = iterator[Symbol.asyncIterator]();
    this.iterator = iterator;
    this._status = defaultStatus;
  }

  private peekItem = async (): Promise<T | Stream.End> => {
    const { iterator, buffer } = this;

    if (buffer.length > 0) return buffer.shift()!;

    const { value, done } = await iterator.next();
    if (done) return Stream.End;
    else return value;
  };

  private consumeItem = (item: T) => {
    this._status = this.statusUpdater?.(item, this._status!);
  };

  /**
   * Consume another value from the iterator updating the status,
   * or return Stream.End if the iterator is done.
   */
  next = async (): Promise<T | Stream.End> => {
    const { currentPeek, peekItem, consumeItem } = this;

    if (currentPeek) throw new Error("Cannot continue in the stream while there is an active peek.");

    const item = await peekItem();
    if (item !== Stream.End) consumeItem(item);

    return item;
  };

  /**
   * Register a new cursor to preview the next items before deciding whether
   * you want to consume them or not. Only one peek can be active at a time –
   * before creating another one or calling next on the stream, be sure to
   * revoke or consume the peek.
   */
  peek = (): Peek<T> => {
    const { currentPeek, peekItem, consumeItem } = this;
    if (currentPeek) throw new Error("There already is an active peek.");

    const returnItems = (items: T[]) => (this.buffer = [...items, ...this.buffer]);
    const consumeItems = (items: T[]) => items.forEach(consumeItem);
    const onDestroy = () => (this.currentPeek = undefined);
    const peek = new Peek(peekItem, returnItems, consumeItems, onDestroy);

    this.currentPeek = peek;
    return peek;
  };
}
export namespace Stream {
  export const End = Symbol("StreamEnd");
  export type End = typeof Stream.End;
}

/**
 * A preview for a stream. You can use it to get a few items, look at them
 * and then either consume them, or return them back to the stream.
 * For each stream, only one peek can be active at a time.
 */
export class Peek<T> implements Iterable<T> {
  constructor(
    private peekItem: () => Promise<T | Stream.End>,
    private returnItems: (items: T[]) => void,
    private consumeItems: (items: T[]) => void,
    private destroy: () => void
  ) {}

  private _alive = true;
  private _items: Array<T | Stream.End> = [];
  private _atEnd = false;
  get alive() {
    return this._alive;
  }
  get items(): ReadonlyArray<T | Stream.End> {
    return this._items;
  }
  get last(): T | Stream.End | undefined {
    return this._items.at(-1);
  }
  get atEnd() {
    return this._atEnd;
  }
  *[Symbol.iterator]() {
    for (const el of this.items) {
      if (el === Stream.End) return;
      else yield el;
    }
  }

  /** Get one or more items and store them in the preview. */
  async next(n = 1) {
    const { _items, peekItem } = this;
    while (n-- > 0) {
      const value = await peekItem();
      if (value === Stream.End) {
        this._atEnd = false;
        break;
      }
      _items.push(value);
    }
  }

  /** Get items while the callback returns true. */
  async nextWhile(f: (item: T) => boolean) {
    do {
      await this.next();
    } while (this.last !== Stream.End && f(this.last!))
    this.rewind();
  }

  /** Give the last one or more items from the preview back to the stream. */
  rewind(n = 1) {
    const { _items, returnItems } = this;
    n = Math.min(n, _items.length);
    if (n > 0) {
      this._atEnd = false;
      returnItems(withoutStreamEnd(_items.splice(-n)));
    }
  }

  /** Return the current items and destroy the peek. */
  consume(): T[] {
    this._alive = false;
    const { _items, consumeItems, destroy } = this;
    const items: T[] = withoutStreamEnd(_items);

    consumeItems(items);
    destroy();
    return items;
  }

  /** Rewind all items and destroy the peek. */
  revoke() {
    this._alive = false;
    const { _items, returnItems, destroy } = this;

    returnItems(withoutStreamEnd(_items));
    destroy();
  }
}
