/**
 * Recursive deep serializer that converts:
 *  - BigInt → string
 *  - Date → ISO string
 *  - Prisma Decimal → number
 * Required when passing Prisma rows from RSC to Client Components.
 */
type Primitive = string | number | boolean | null | undefined;

// Prisma's Decimal class shape (we don't import the type to avoid runtime cost).
type DecimalLike = { d: readonly number[]; e: number; s: number };

export type Serialized<T> = T extends bigint
  ? string
  : T extends Date
    ? string
    : T extends DecimalLike
      ? number
      : T extends Primitive
        ? T
        : T extends Array<infer U>
          ? Array<Serialized<U>>
          : T extends object
            ? { [K in keyof T]: Serialized<T[K]> }
            : T;

export function serialize<T>(value: T): Serialized<T> {
  if (value === null || value === undefined) return value as Serialized<T>;
  if (typeof value === "bigint") return value.toString() as Serialized<T>;
  if (value instanceof Date) return value.toISOString() as Serialized<T>;
  // Prisma Decimal exposes a `toFixed` method ; fallback to its string repr.
  if (
    typeof value === "object" &&
    value !== null &&
    "toFixed" in value &&
    typeof (value as { toFixed: unknown }).toFixed === "function"
  ) {
    return Number((value as { toString: () => string }).toString()) as Serialized<T>;
  }
  if (Array.isArray(value)) {
    return value.map((v) => serialize(v)) as Serialized<T>;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serialize(v);
    }
    return out as Serialized<T>;
  }
  return value as Serialized<T>;
}
