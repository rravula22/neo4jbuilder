import { NextRequest, NextResponse } from "next/server";

import { ApiError, isPlainObject, jsonError, parseCypherIdentifier, parseProperties, toCypherIdentifier } from "@/lib/graph-api";
import type { CreateRelationshipRequest, GenerateCypherResponse } from "@/types/graph";

export const runtime = "nodejs";

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

function parseOptionalLabel(value: unknown, fieldLabel: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseCypherIdentifier(value, "INVALID_LABEL", fieldLabel);
}

function parseCreateRelationshipPayload(value: unknown): CreateRelationshipRequest {
  if (!isPlainObject(value)) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be a JSON object");
  }

  return {
    fromId: parseId(value.fromId, "fromId"),
    toId: parseId(value.toId, "toId"),
    fromLabel: parseOptionalLabel(value.fromLabel, "fromLabel"),
    toLabel: parseOptionalLabel(value.toLabel, "toLabel"),
    type: parseCypherIdentifier(value.type, "INVALID_TYPE", "Relationship type"),
    properties: parseProperties(value.properties),
  };
}

export async function GET() {
  return jsonError(new ApiError(405, "METHOD_NOT_ALLOWED", "Use POST to generate relationship Cypher"));
}

export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
    }

    const { fromId, toId, fromLabel, toLabel, type, properties } = parseCreateRelationshipPayload(payload);
    const safeType = toCypherIdentifier(type);
    const parsedProperties = properties ?? {};

    const fromPattern = fromLabel
      ? `(from:${toCypherIdentifier(fromLabel)} { id: $fromId })`
      : "(from { id: $fromId })";
    const toPattern = toLabel ? `(to:${toCypherIdentifier(toLabel)} { id: $toId })` : "(to { id: $toId })";

    const hasProperties = Object.keys(parsedProperties).length > 0;
    const query = hasProperties
      ? `MATCH ${fromPattern}, ${toPattern} CREATE (from)-[r:${safeType}]->(to) SET r += $properties RETURN r`
      : `MATCH ${fromPattern}, ${toPattern} CREATE (from)-[r:${safeType}]->(to) RETURN r`;

    const response: GenerateCypherResponse = {
      data: {
        query,
        params: hasProperties ? { fromId, toId, properties: parsedProperties } : { fromId, toId },
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
