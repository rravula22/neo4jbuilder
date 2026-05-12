import { NextRequest, NextResponse } from "next/server";

import { withReadSession, withWriteSession } from "@/lib/neo4j";
import { ApiError, isPlainObject, jsonError, parseCypherIdentifier, parseProperties, toCypherIdentifier } from "@/lib/graph-api";
import type { CreateNodeRequest, GraphNode, GraphProperties } from "@/types/graph";

export const runtime = "nodejs";

function parseCreateNodePayload(value: unknown): CreateNodeRequest {
  if (!isPlainObject(value)) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be a JSON object");
  }

  return {
    label: parseCypherIdentifier(value.label, "INVALID_LABEL", "Label"),
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
    const safeLabel = toCypherIdentifier(label);

    const node = await withWriteSession(async (session) => {
      const result = await session.run(
        `CREATE (n:${safeLabel}) SET n += $properties RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS properties`,
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
