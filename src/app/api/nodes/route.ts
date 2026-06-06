import { NextRequest, NextResponse } from "next/server";

import { ApiError, isPlainObject, jsonError, parseCypherIdentifier, parseProperties, toCypherIdentifier } from "@/lib/graph-api";
import type { CreateNodeRequest, GenerateCypherResponse } from "@/types/graph";

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

export async function GET() {
  return jsonError(new ApiError(405, "METHOD_NOT_ALLOWED", "Use POST to generate node Cypher"));
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

    const response: GenerateCypherResponse = {
      data: {
        query: `CREATE (n:${safeLabel}) SET n += $properties RETURN n`,
        params: { properties },
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
