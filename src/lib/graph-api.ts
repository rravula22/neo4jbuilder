import { NextResponse } from "next/server";

import { GRAPH_IDENTIFIER_PATTERN, isGraphPropertyValue } from "@/lib/graph-validation";
import type { ErrorResponse, GraphProperties } from "@/types/graph";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: string;

  constructor(status: number, code: string, message: string, details?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonError(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status }
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Request failed",
        details: message,
      },
    },
    { status: 500 }
  );
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseProperties(value: unknown): GraphProperties {
  if (value === undefined) {
    return {};
  }

  if (!isPlainObject(value)) {
    throw new ApiError(400, "INVALID_PROPERTIES", "Properties must be a plain object");
  }

  const parsed: GraphProperties = {};
  for (const [key, propertyValue] of Object.entries(value)) {
    if (!GRAPH_IDENTIFIER_PATTERN.test(key)) {
      throw new ApiError(
        400,
        "INVALID_PROPERTIES",
        "Property keys must start with a letter and contain only letters, numbers, and underscores"
      );
    }

    if (!isGraphPropertyValue(propertyValue)) {
      throw new ApiError(
        400,
        "INVALID_PROPERTIES",
        "Property values must be string, number, boolean, null, or arrays of those values"
      );
    }

    parsed[key] = propertyValue;
  }

  return parsed;
}

export function parseCypherIdentifier(value: unknown, code: string, fieldLabel: string): string {
  if (typeof value !== "string") {
    throw new ApiError(400, code, `${fieldLabel} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, code, `${fieldLabel} is required`);
  }

  if (!GRAPH_IDENTIFIER_PATTERN.test(trimmed)) {
    throw new ApiError(
      400,
      code,
      `${fieldLabel} must start with a letter and contain only letters, numbers, and underscores`
    );
  }

  return trimmed;
}

export function toCypherIdentifier(identifier: string): string {
  return `\`${identifier.replaceAll("`", "``")}\``;
}
