import { NextRequest, NextResponse } from "next/server";

import { withReadSession, withWriteSession } from "@/lib/neo4j";
import type {
  CreateRelationshipRequest,
  ErrorResponse,
  GraphProperties,
  GraphPropertyValue,
  GraphRelationship,
} from "@/types/graph";

export const runtime = "nodejs";

const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

class ApiError extends Error {
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

function jsonError(error: unknown): NextResponse<ErrorResponse> {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGraphPropertyValue(value: unknown): value is GraphPropertyValue {
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

function parseId(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ID", `${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, "INVALID_ID", `${field} is required`);
  }

  return trimmed;
}

function parseType(value: unknown): string {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_TYPE", "Relationship type must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, "INVALID_TYPE", "Relationship type is required");
  }

  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    throw new ApiError(
      400,
      "INVALID_TYPE",
      "Relationship type must start with a letter and contain only letters, numbers, and underscores"
    );
  }

  return trimmed;
}

function parseProperties(value: unknown): GraphProperties {
  if (value === undefined) {
    return {};
  }

  if (!isPlainObject(value)) {
    throw new ApiError(400, "INVALID_PROPERTIES", "Properties must be a plain object");
  }

  const entries = Object.entries(value);
  for (const [key, propertyValue] of entries) {
    if (!IDENTIFIER_PATTERN.test(key)) {
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
  }

  return value;
}

function parseCreateRelationshipPayload(value: unknown): CreateRelationshipRequest {
  if (!isPlainObject(value)) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be a JSON object");
  }

  return {
    fromId: parseId(value.fromId, "fromId"),
    toId: parseId(value.toId, "toId"),
    type: parseType(value.type),
    properties: parseProperties(value.properties),
  };
}

function mapRelationship(record: { get: (key: string) => unknown }): GraphRelationship {
  return {
    id: String(record.get("id")),
    type: String(record.get("type")),
    fromId: String(record.get("fromId")),
    toId: String(record.get("toId")),
    properties: (record.get("properties") as GraphProperties) ?? {},
  };
}

export async function GET() {
  try {
    const relationships = await withReadSession(async (session) => {
      const result = await session.run(
        "MATCH (from)-[r]->(to) RETURN elementId(r) AS id, type(r) AS type, elementId(from) AS fromId, elementId(to) AS toId, properties(r) AS properties ORDER BY id"
      );
      return result.records.map(mapRelationship);
    });

    return NextResponse.json({ data: relationships });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
    }

    const { fromId, toId, type, properties } = parseCreateRelationshipPayload(payload);

    const relationship = await withWriteSession(async (session) => {
      const result = await session.run(
        `MATCH (from), (to)
         WHERE elementId(from) = $fromId AND elementId(to) = $toId
         CREATE (from)-[r:\`${type}\`]->(to)
         SET r += $properties
         RETURN elementId(r) AS id, type(r) AS type, elementId(from) AS fromId, elementId(to) AS toId, properties(r) AS properties`,
        { fromId, toId, properties }
      );

      const [record] = result.records;
      if (!record) {
        throw new ApiError(404, "NODE_NOT_FOUND", "Could not find nodes for the provided fromId/toId");
      }

      return mapRelationship(record);
    });

    return NextResponse.json({ data: relationship }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
