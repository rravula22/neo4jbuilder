import { NextRequest, NextResponse } from "next/server";

import { withReadSession, withWriteSession } from "@/lib/neo4j";
import type { CreateNodeRequest, ErrorResponse, GraphNode, GraphProperties, GraphPropertyValue } from "@/types/graph";

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

function parseLabel(value: unknown): string {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_LABEL", "Label must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, "INVALID_LABEL", "Label is required");
  }

  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    throw new ApiError(
      400,
      "INVALID_LABEL",
      "Label must start with a letter and contain only letters, numbers, and underscores"
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
  const parsed: GraphProperties = {};
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

    parsed[key] = propertyValue;
  }

  return parsed;
}

function parseCreateNodePayload(value: unknown): CreateNodeRequest {
  if (!isPlainObject(value)) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be a JSON object");
  }

  return {
    label: parseLabel(value.label),
    properties: parseProperties(value.properties),
  };
}

function mapNode(record: { get: (key: string) => unknown }): GraphNode {
  return {
    id: String(record.get("id")),
    labels: (record.get("labels") as string[]) ?? [],
    properties: (record.get("properties") as GraphProperties) ?? {},
  };
}

export async function GET() {
  try {
    const nodes = await withReadSession(async (session) => {
      const result = await session.run(
        "MATCH (n) RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS properties ORDER BY id"
      );
      return result.records.map(mapNode);
    });

    return NextResponse.json({ data: nodes });
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

    const { label, properties } = parseCreateNodePayload(payload);

    const node = await withWriteSession(async (session) => {
      const result = await session.run(
        `CREATE (n:\`${label}\`) SET n += $properties RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS properties`,
        { properties }
      );

      const [record] = result.records;
      if (!record) {
        throw new ApiError(500, "NODE_CREATE_FAILED", "Failed to create node");
      }

      return mapNode(record);
    });

    return NextResponse.json({ data: node }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
