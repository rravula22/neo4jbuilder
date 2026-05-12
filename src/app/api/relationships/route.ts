import { NextRequest, NextResponse } from "next/server";

import { withReadSession, withWriteSession } from "@/lib/neo4j";
import { ApiError, isPlainObject, jsonError, parseCypherIdentifier, parseProperties, toCypherIdentifier } from "@/lib/graph-api";
import type { CreateRelationshipRequest, GraphProperties, GraphRelationship } from "@/types/graph";

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

function parseCreateRelationshipPayload(value: unknown): CreateRelationshipRequest {
  if (!isPlainObject(value)) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be a JSON object");
  }

  return {
    fromId: parseId(value.fromId, "fromId"),
    toId: parseId(value.toId, "toId"),
    type: parseCypherIdentifier(value.type, "INVALID_TYPE", "Relationship type"),
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
    const safeType = toCypherIdentifier(type);

    const relationship = await withWriteSession(async (session) => {
      const result = await session.run(
        `MATCH (from), (to)
         WHERE elementId(from) = $fromId AND elementId(to) = $toId
         CREATE (from)-[r:${safeType}]->(to)
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
