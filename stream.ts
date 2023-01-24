/** A user-friendly wrapper around AsyncIterator that allows for peek-forwards and rewind-backs. */
export class Stream<T> {
  private iterator: Iterator<T> | AsyncIterator<T>;
  private buffer: T[] = [];
  private currentPeek: Peek<T> | undefined;

  constructor(iterator: Iterator<T> | Iterable<T> | AsyncIterator<T> | AsyncIterable<T>) {
    if (Symbol.iterator in iterator) iterator = iterator[Symbol.iterator]();
    if (Symbol.asyncIterator in iterator) iterator = iterator[Symbol.asyncIterator]();
    this.iterator = iterator;
  }

  /** Consume another value from the iterator, or return Stream.End if the iterator is done. */
  async next(): Promise<T | Stream.End> {
    const { iterator, buffer, currentPeek } = this;

    if (currentPeek) throw new Error("Cannot continue in the stream while there is an active peek.");

    if (buffer.length > 0) return buffer.pop()!;

    const { value, done } = await iterator.next();
    if (done) return Stream.End;
    else return value;
  }

  /**
   * Register a new cursor to preview the next items before deciding whether
   * you want to consume them or not. Only one peek can be active at a time –
   * before creating another one or calling next on the stream, be sure to
   * revoke or consume the peek.
   */
  peek(): Peek<T> {
    if (this.currentPeek) throw new Error("There already is an active peek.");

    const returnItems = (items: T[]) => void this.buffer.push(...items);
    const onDestroy = () => (this.currentPeek = undefined);
    const peek = new Peek(this, returnItems, onDestroy);

    this.currentPeek = peek;
    return peek;
  }
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
  constructor(private stream: Stream<T>, private returnItems: (items: T[]) => void, private destroy: () => void) {}

  private _alive = true;
  _items: T[] = [];
  get alive() {
    return this._alive;
  }
  get items(): readonly T[] {
    return this._items;
  }
  [Symbol.iterator]() {
    return this._items[Symbol.iterator]();
  }

  /** Get one or more items and store them in the preview. */
  async next(n = 1) {
    const { stream, _items } = this;
    while (n-- > 0) {
      const value = await stream.next();
      if (value === Stream.End) break;
      _items.push(value);
    }
  }

  /** Give the last one or more items from the preview back to the stream. */
  rewind(n = 1) {
    const { _items, returnItems } = this;
    n = Math.min(n, _items.length);
    returnItems(_items.splice(-n));
  }

  /** Return the current items and destroy the peek. */
  consume(): T[] {
    this._alive = false;
    this.destroy();
    return this._items;
  }

  /** Rewind all items and destroy the peek. */
  revoke() {
    this._alive = false;
    this.returnItems(this._items);
    this.destroy();
  }
}
