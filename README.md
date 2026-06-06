# Neo4j Builder

Neo4j Builder is a minimal Next.js app for generating Cypher queries for nodes and relationships.

It does **not** execute writes against Neo4j. The app returns generated query text and parameters only.

## Prerequisites

- Node.js 18+

## Setup

Install dependencies:

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Lint and build

```bash
npm run lint
npm run build
```

## API endpoints

- `POST /api/nodes` - generate node Cypher from `{ label, properties }`
- `POST /api/relationships` - generate relationship Cypher from `{ fromId, toId, fromLabel?, toLabel?, type, properties }`; optional labels add label constraints in the generated `MATCH` clause and IDs map to `from.id` / `to.id` predicates

Example response shape:

```json
{
  "data": {
    "query": "CREATE (n:`Person`) SET n += $properties RETURN n",
    "params": {
      "properties": {
        "name": "Alice"
      }
    }
  }
}
```

Both endpoints validate inputs strictly and return consistent JSON errors in the shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": "Optional details"
  }
}
```
