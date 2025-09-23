export function ensure<T>(value: T | undefined, message = "Value is undefined"): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}