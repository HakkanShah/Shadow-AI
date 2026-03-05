type TimestampLike = {
  toDate: () => Date;
};

const isTimestampLike = (value: unknown): value is TimestampLike => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "toDate" in value &&
      typeof (value as TimestampLike).toDate === "function"
  );
};

export const serializeFirestoreValue = (value: unknown): unknown => {
  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreValue(item));
  }

  if (value && typeof value === "object") {
    const mapped: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      mapped[key] = serializeFirestoreValue(child);
    }
    return mapped;
  }

  return value;
};
