import { Hono } from "hono";
import { serve } from "@hono/node-server";

import { env } from "./config/env.js";
import { neo4jDriver } from "./config/neo4j.js";
import graphRoutes from "./routes/graph.routes.js";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    name: "GraphPilot",
    version: "0.1.0",
    status: "running",
  });
});

app.get("/health", async (c) => {
  try {
    await neo4jDriver.verifyConnectivity();

    return c.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Neo4j connection failed:", error);

    return c.json({
      status: "error",
      database: "disconnected",
    }, 503);
  }
});

app.route("/api/graph", graphRoutes);

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`GraphPilot API running on http://localhost:${env.PORT}`);

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down...`);

  server.close(async () => {
    await neo4jDriver.close();
    process.exit(0);
  });
};

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));