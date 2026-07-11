import Fastify, { type FastifyInstance } from "fastify";
import { systemIdentity } from "@sandtable/domain";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({
    status: "ok",
    system: systemIdentity.name,
    version: systemIdentity.protocolVersion
  }));

  app.get("/api/v1", async () => ({
    name: systemIdentity.name,
    stage: "technical-prototype"
  }));

  return app;
}

