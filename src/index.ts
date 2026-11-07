import { Hono } from "hono";
import { serve } from "@hono/node-server";

import { env } from "./config/env.js";
import { neo4jDriver } from "./config/neo4j.js";

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

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`GraphPilot API running on http://localhost:${env.PORT}`);