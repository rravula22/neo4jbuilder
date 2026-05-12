import neo4j, { Driver, Session } from "neo4j-driver";

const REQUIRED_ENV_VARS = ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD"] as const;

function getEnv(name: (typeof REQUIRED_ENV_VARS)[number]): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

declare global {
  // eslint-disable-next-line no-var
  var __neo4jDriver: Driver | undefined;
}

function createDriver(): Driver {
  const uri = getEnv("NEO4J_URI");
  const username = getEnv("NEO4J_USERNAME");
  const password = getEnv("NEO4J_PASSWORD");

  return neo4j.driver(uri, neo4j.auth.basic(username, password));
}

export function getNeo4jDriver(): Driver {
  if (!global.__neo4jDriver) {
    global.__neo4jDriver = createDriver();
  }

  return global.__neo4jDriver;
}

export async function withReadSession<T>(fn: (session: Session) => Promise<T>): Promise<T> {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

export async function withWriteSession<T>(fn: (session: Session) => Promise<T>): Promise<T> {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}
