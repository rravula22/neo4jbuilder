export type GraphPrimitive = string | number | boolean | null;
export type GraphPropertyValue = GraphPrimitive | GraphPrimitive[];
export type GraphProperties = Record<string, GraphPropertyValue>;

export interface CreateNodeRequest {
  label: string;
  properties?: GraphProperties;
}

export interface CreateRelationshipRequest {
  fromId: string;
  toId: string;
  fromLabel?: string;
  toLabel?: string;
  type: string;
  properties?: GraphProperties;
}

export interface GeneratedCypherStatement {
  query: string;
  params: Record<string, unknown>;
}

export interface GenerateCypherResponse {
  data: GeneratedCypherStatement;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}
