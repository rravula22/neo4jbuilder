"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { CreateNodeRequest, CreateRelationshipRequest, ErrorResponse, GraphNode, GraphRelationship } from "@/types/graph";

function stringifyProperties(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function parsePropertiesInput(input: string): Record<string, unknown> {
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

  return parsed as Record<string, unknown>;
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
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [relationships, setRelationships] = useState<GraphRelationship[]>([]);
  const [isLoadingNodes, setIsLoadingNodes] = useState(true);
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(true);

  const [nodeLabel, setNodeLabel] = useState("");
  const [nodePropertiesInput, setNodePropertiesInput] = useState("{}");
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [isSubmittingNode, setIsSubmittingNode] = useState(false);

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [relationshipPropertiesInput, setRelationshipPropertiesInput] = useState("{}");
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [isSubmittingRelationship, setIsSubmittingRelationship] = useState(false);

  const canCreateRelationship = useMemo(() => nodes.length >= 2, [nodes.length]);

  const loadNodes = useCallback(async () => {
    setIsLoadingNodes(true);
    try {
      const response = await fetch("/api/nodes", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json()) as { data: GraphNode[] };
      setNodes(payload.data);
      if (!fromId && payload.data.length > 0) {
        setFromId(payload.data[0].id);
      }
      if (!toId && payload.data.length > 1) {
        setToId(payload.data[1].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load nodes";
      setNodeError(message);
    } finally {
      setIsLoadingNodes(false);
    }
  }, [fromId, toId]);

  const loadRelationships = useCallback(async () => {
    setIsLoadingRelationships(true);
    try {
      const response = await fetch("/api/relationships", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json()) as { data: GraphRelationship[] };
      setRelationships(payload.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load relationships";
      setRelationshipError(message);
    } finally {
      setIsLoadingRelationships(false);
    }
  }, []);

  useEffect(() => {
    void loadNodes();
    void loadRelationships();
  }, [loadNodes, loadRelationships]);

  async function handleCreateNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNodeError(null);

    const trimmedLabel = nodeLabel.trim();
    if (!trimmedLabel) {
      setNodeError("Node label is required");
      return;
    }

    let properties: Record<string, unknown>;
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

      const created = (await response.json()) as { data: GraphNode };
      setNodes((previous) => [...previous, created.data]);
      setNodeLabel("");
      setNodePropertiesInput("{}");
      if (!fromId) {
        setFromId(created.data.id);
      } else if (!toId) {
        setToId(created.data.id);
      }
    } catch (error) {
      setNodeError(error instanceof Error ? error.message : "Failed to create node");
    } finally {
      setIsSubmittingNode(false);
    }
  }

  async function handleCreateRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRelationshipError(null);

    if (!fromId || !toId) {
      setRelationshipError("fromId and toId are required");
      return;
    }

    const trimmedType = relationshipType.trim();
    if (!trimmedType) {
      setRelationshipError("Relationship type is required");
      return;
    }

    let properties: Record<string, unknown>;
    try {
      properties = parsePropertiesInput(relationshipPropertiesInput);
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : "Invalid properties");
      return;
    }

    setIsSubmittingRelationship(true);
    try {
      const payload: CreateRelationshipRequest = {
        fromId,
        toId,
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

      const created = (await response.json()) as { data: GraphRelationship };
      setRelationships((previous) => [...previous, created.data]);
      setRelationshipType("");
      setRelationshipPropertiesInput("{}");
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : "Failed to create relationship");
    } finally {
      setIsSubmittingRelationship(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6 md:p-10">
      <h1 className="text-3xl font-semibold">Neo4j Builder MVP</h1>
      <p className="mt-2 text-sm text-slate-600">
        Create and list nodes first, then create and list relationships between existing nodes.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-medium">Create Node</h2>
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
              {isSubmittingNode ? "Creating..." : "Create Node"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-medium">Nodes</h2>
          {isLoadingNodes ? <p className="mt-4 text-sm text-slate-600">Loading nodes...</p> : null}
          {!isLoadingNodes && nodes.length === 0 ? <p className="mt-4 text-sm text-slate-600">No nodes yet.</p> : null}
          <ul className="mt-4 space-y-2 text-sm">
            {nodes.map((node) => (
              <li className="rounded border border-slate-200 p-3" key={node.id}>
                <div className="font-medium">{node.labels.join(":") || "(no label)"}</div>
                <div className="mt-1 text-xs text-slate-500">id: {node.id}</div>
                <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs">
                  {stringifyProperties(node.properties)}
                </pre>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-medium">Create Relationship</h2>
          <form className="mt-4 space-y-4" onSubmit={handleCreateRelationship}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="from-id">
                  From Node
                </label>
                <select
                  id="from-id"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={fromId}
                  onChange={(event) => setFromId(event.target.value)}
                  disabled={!canCreateRelationship}
                >
                  <option value="">Select node</option>
                  {nodes.map((node) => (
                    <option key={`from-${node.id}`} value={node.id}>
                      {node.labels.join(":") || node.id} ({node.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="to-id">
                  To Node
                </label>
                <select
                  id="to-id"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={toId}
                  onChange={(event) => setToId(event.target.value)}
                  disabled={!canCreateRelationship}
                >
                  <option value="">Select node</option>
                  {nodes.map((node) => (
                    <option key={`to-${node.id}`} value={node.id}>
                      {node.labels.join(":") || node.id} ({node.id})
                    </option>
                  ))}
                </select>
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
                placeholder="KNOWS"
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
            {!canCreateRelationship ? (
              <p className="text-sm text-slate-600">Create at least 2 nodes to add a relationship.</p>
            ) : null}
            {relationshipError ? <p className="text-sm text-red-600">{relationshipError}</p> : null}
            <button
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!canCreateRelationship || isSubmittingRelationship}
              type="submit"
            >
              {isSubmittingRelationship ? "Creating..." : "Create Relationship"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-medium">Relationships</h2>
          {isLoadingRelationships ? <p className="mt-4 text-sm text-slate-600">Loading relationships...</p> : null}
          {!isLoadingRelationships && relationships.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No relationships yet.</p>
          ) : null}
          <ul className="mt-4 space-y-2 text-sm">
            {relationships.map((relationship) => (
              <li className="rounded border border-slate-200 p-3" key={relationship.id}>
                <div className="font-medium">{relationship.type}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {relationship.fromId} → {relationship.toId}
                </div>
                <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs">
                  {stringifyProperties(relationship.properties)}
                </pre>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
