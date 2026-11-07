import { Hono } from "hono";
import { GraphRepository } from "../repositories/graph.repository.js";

const graphRoutes = new Hono();
const graphRepository = new GraphRepository();

graphRoutes.post("/architecture", async (c) => {
  try {
    const graph = await graphRepository.createArchitecture();

    return c.json({
      status: "created",
      graph,
    });
  } catch (error) {
    console.error(error);

    return c.json({
      error: "Unable to create architecture",
    }, 500);
  }
});

export default graphRoutes;