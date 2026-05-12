export type GraphPrimitive = string | number | boolean | null;
export type GraphPropertyValue = GraphPrimitive | GraphPrimitive[];
export type GraphProperties = Record<string, GraphPropertyValue>;

export interface GraphNode {
  id: string;
  labels: string[];
  properties: GraphProperties;
}

export interface GraphRelationship {
  id: string;
  type: string;
  fromId: string;
  toId: string;
  properties: GraphProperties;
}

export interface CreateNodeRequest {
  label: string;
  properties?: GraphProperties;
}

export interface CreateRelationshipRequest {
  fromId: string;
  toId: string;
  type: string;
  properties?: GraphProperties;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}
