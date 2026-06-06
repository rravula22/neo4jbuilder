"use client";

import { FormEvent, useRef, useState } from "react";

import { isGraphPropertyValue } from "@/lib/graph-validation";
import type {
  CreateNodeRequest,
  CreateRelationshipRequest,
  ErrorResponse,
  GenerateCypherResponse,
  GraphProperties,
} from "@/types/graph";

type StatementKind = "node" | "relationship";

interface QueryHistoryEntry {
  id: number;
  kind: StatementKind;
  query: string;
  params: Record<string, unknown>;
}

function stringifyProperties(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function parsePropertiesInput(input: string): GraphProperties {
  const trimmed = input.trim();
  if (!trimmed) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Properties must be valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Properties must be a JSON object");
  }

  const objectEntries = Object.entries(parsed);
  const properties: GraphProperties = {};
  for (const [key, value] of objectEntries) {
    if (!isGraphPropertyValue(value)) {
      throw new Error("Property values must be string, number, boolean, null, or arrays of those values");
    }
    properties[key] = value;
  }

  return properties;
}

async function readErrorMessage(response: Response): Promise<string> {
  let payload: ErrorResponse | undefined;
  try {
    payload = (await response.json()) as ErrorResponse;
  } catch {
    return "Request failed";
  }

  return payload.error?.message ?? "Request failed";
}

export default function Home() {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const nextHistoryId = useRef(1);

  const [nodeLabel, setNodeLabel] = useState("");
  const [nodePropertiesInput, setNodePropertiesInput] = useState("{}");
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [isSubmittingNode, setIsSubmittingNode] = useState(false);

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [relationshipPropertiesInput, setRelationshipPropertiesInput] = useState("{}");
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [isSubmittingRelationship, setIsSubmittingRelationship] = useState(false);

  async function handleCreateNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNodeError(null);

    const trimmedLabel = nodeLabel.trim();
    if (!trimmedLabel) {
      setNodeError("Node label is required");
      return;
    }

    let properties: GraphProperties;
    try {
      properties = parsePropertiesInput(nodePropertiesInput);
    } catch (error) {
      setNodeError(error instanceof Error ? error.message : "Invalid properties");
      return;
    }

    setIsSubmittingNode(true);
    try {
      const payload: CreateNodeRequest = {
        label: trimmedLabel,
        properties,
      };

      const response = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const generated = (await response.json()) as GenerateCypherResponse;
      setHistory((previous) => [
        {
          id: nextHistoryId.current++,
          kind: "node",
          query: generated.data.query,
          params: generated.data.params,
        },
        ...previous,
      ]);
      setNodeLabel("");
      setNodePropertiesInput("{}");
    } catch (error) {
      setNodeError(error instanceof Error ? error.message : "Failed to generate node Cypher");
    } finally {
      setIsSubmittingNode(false);
    }
  }

  async function handleCreateRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRelationshipError(null);

    if (!fromId.trim() || !toId.trim()) {
      setRelationshipError("From ID and To ID are required");
      return;
    }

    const trimmedType = relationshipType.trim();
    if (!trimmedType) {
      setRelationshipError("Relationship type is required");
      return;
    }

    let properties: GraphProperties;
    try {
      properties = parsePropertiesInput(relationshipPropertiesInput);
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : "Invalid properties");
      return;
    }

    setIsSubmittingRelationship(true);
    try {
      const payload: CreateRelationshipRequest = {
        fromId: fromId.trim(),
        toId: toId.trim(),
        fromLabel: fromLabel.trim() || undefined,
        toLabel: toLabel.trim() || undefined,
        type: trimmedType,
        properties,
      };

      const response = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const generated = (await response.json()) as GenerateCypherResponse;
      setHistory((previous) => [
        {
          id: nextHistoryId.current++,
          kind: "relationship",
          query: generated.data.query,
          params: generated.data.params,
        },
        ...previous,
      ]);
      setFromId("");
      setToId("");
      setFromLabel("");
      setToLabel("");
      setRelationshipType("");
      setRelationshipPropertiesInput("{}");
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : "Failed to generate relationship Cypher");
    } finally {
      setIsSubmittingRelationship(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6 md:p-10">
      <h1 className="text-3xl font-semibold">Neo4j Cypher Generator</h1>
      <p className="mt-2 text-sm text-slate-600">
        Generate Cypher statements for nodes and relationships without writing anything to a Neo4j database.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-medium">Generate Node Cypher</h2>
          <form className="mt-4 space-y-4" onSubmit={handleCreateNode}>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="node-label">
                Label
              </label>
              <input
                id="node-label"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={nodeLabel}
                onChange={(event) => setNodeLabel(event.target.value)}
                placeholder="Person"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="node-properties">
                Properties (JSON object)
              </label>
              <textarea
                id="node-properties"
                className="h-28 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
                value={nodePropertiesInput}
                onChange={(event) => setNodePropertiesInput(event.target.value)}
              />
            </div>
            {nodeError ? <p className="text-sm text-red-600">{nodeError}</p> : null}
            <button
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmittingNode}
              type="submit"
            >
              {isSubmittingNode ? "Generating..." : "Generate Node Query"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-medium">Generate Relationship Cypher</h2>
          <form className="mt-4 space-y-4" onSubmit={handleCreateRelationship}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="from-id">
                  From Node ID
                </label>
                <input
                  id="from-id"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={fromId}
                  onChange={(event) => setFromId(event.target.value)}
                  placeholder="person-1"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="to-id">
                  To Node ID
                </label>
                <input
                  id="to-id"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={toId}
                  onChange={(event) => setToId(event.target.value)}
                  placeholder="company-1"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="from-label">
                  from label (optional)
                </label>
                <input
                  id="from-label"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={fromLabel}
                  onChange={(event) => setFromLabel(event.target.value)}
                  placeholder="Person"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="to-label">
                  to label (optional)
                </label>
                <input
                  id="to-label"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={toLabel}
                  onChange={(event) => setToLabel(event.target.value)}
                  placeholder="Company"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="relationship-type">
                Type
              </label>
              <input
                id="relationship-type"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={relationshipType}
                onChange={(event) => setRelationshipType(event.target.value)}
                placeholder="WORKS_AT"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="relationship-properties">
                Properties (JSON object)
              </label>
              <textarea
                id="relationship-properties"
                className="h-28 w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
                value={relationshipPropertiesInput}
                onChange={(event) => setRelationshipPropertiesInput(event.target.value)}
              />
            </div>
            {relationshipError ? <p className="text-sm text-red-600">{relationshipError}</p> : null}
            <button
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmittingRelationship}
              type="submit"
            >
              {isSubmittingRelationship ? "Generating..." : "Generate Relationship Query"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-medium">Generated Cypher</h2>
          {history.length === 0 ? <p className="mt-4 text-sm text-slate-600">No generated queries yet.</p> : null}
          <ul className="mt-4 space-y-3 text-sm">
            {history.map((entry) => (
              <li className="rounded border border-slate-200 p-3" key={entry.id}>
                <div className="font-medium capitalize">{entry.kind} query</div>
                <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs">{entry.query}</pre>
                <div className="mt-2 text-xs font-medium text-slate-600">params</div>
                <pre className="mt-1 overflow-auto rounded bg-slate-50 p-2 text-xs">{stringifyProperties(entry.params)}</pre>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
