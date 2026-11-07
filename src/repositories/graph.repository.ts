import { neo4jDriver } from "../config/neo4j.js";

export class GraphRepository {
  async createArchitecture() {
    const session = neo4jDriver.session();

    try {
      const result = await session.run(`
        MERGE (payment:Service {name: "Payment Service"})
        MERGE (order:Service {name: "Order Service"})
        MERGE (notification:Service {name: "Notification Service"})

        MERGE (event:Event {name: "PaymentCompleted"})

        MERGE (payment)-[:PUBLISHES]->(event)
        MERGE (event)-[:CONSUMED_BY]->(order)
        MERGE (order)-[:DEPENDS_ON]->(notification)

        RETURN payment, event, order, notification
      `);

      return result.records.map((record) => ({
        payment: record.get("payment").properties,
        event: record.get("event").properties,
        order: record.get("order").properties,
        notification: record.get("notification").properties,
      }));
    } finally {
      await session.close();
    }
  }
}