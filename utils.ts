/** A throw expression polyfill with a cool name */
export function yeet(msg: string): never;
export function yeet(err: { new (msg: string ): any }, msg: string): never;
export function yeet(a: string | { new (msg: string ): any }, b?: string): never {
    if (typeof a === "string") throw new Error(a);
    throw new a(b!);
}
