# Neo4j Builder

Neo4j Builder is a minimal Next.js app for creating and listing Neo4j nodes and relationships from a browser UI.

## Prerequisites

- Node.js 18+
- A running Neo4j database

## Setup

Create `/home/runner/work/neo4jbuilder/neo4jbuilder/.env.local` with:

```bash
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
```

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

- `GET /api/nodes` - list nodes
- `POST /api/nodes` - create node with `{ label, properties }`
- `GET /api/relationships` - list relationships
- `POST /api/relationships` - create relationship with `{ fromId, toId, type, properties }`

Both POST endpoints validate inputs strictly and return consistent JSON errors in the shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": "Optional details"
  }
}
```
