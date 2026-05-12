import type { GraphPropertyValue } from "@/types/graph";

const MAX_IDENTIFIER_LENGTH = 64;
export const GRAPH_IDENTIFIER_PATTERN = new RegExp(`^[A-Za-z][A-Za-z0-9_]{0,${MAX_IDENTIFIER_LENGTH - 1}}$`);

export function isGraphPropertyValue(value: unknown): value is GraphPropertyValue {
  if (value === null) {
    return true;
  }

  if (["string", "number", "boolean"].includes(typeof value)) {
    return true;
  }

  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
}
