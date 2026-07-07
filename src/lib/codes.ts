export function nextCode(prefix: string, existingCodes: Array<string | null | undefined>, width = 6) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  const maxNumber = existingCodes.reduce((max, code) => {
    const match = code?.match(pattern);
    if (!match) return max;
    return Math.max(max, Number(match[1] ?? 0));
  }, 0);

  return `${prefix}-${String(maxNumber + 1).padStart(width, "0")}`;
}
