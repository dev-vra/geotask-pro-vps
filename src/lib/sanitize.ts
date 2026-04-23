/**
 * Utility to sanitize user input strings to prevent XSS.
 * Removes common dangerous HTML tags and event handlers.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return input;

  // 1. Basic HTML tag stripping (very restrictive)
  let sanitized = input.replace(/<[^>]*>?/gm, "");

  // 2. Remove common XSS patterns that might survive tag stripping 
  // (e.g., event handlers inside attributes if we ever allow some tags)
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, "");
  sanitized = sanitized.replace(/javascript:[^"]*/gi, "");

  return sanitized.trim();
}

/**
 * Recursively sanitizes all string properties in an object.
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(v => typeof v === "object" ? sanitizeObject(v) : (typeof v === "string" ? sanitizeString(v) : v)) as any;
  }

  const result = { ...obj } as any;
  for (const key in result) {
    if (typeof result[key] === "string") {
      result[key] = sanitizeString(result[key]);
    } else if (typeof result[key] === "object" && result[key] !== null) {
      result[key] = sanitizeObject(result[key]);
    }
  }
  return result;
}
