import neo4j from "neo4j-driver";
import { neo4jDriver } from "../config/neo4j.js";

export class GraphRepository {
  async createArchitecture() {
    const { records } = await neo4jDriver.executeQuery(
      `
        MERGE (payment:Service {name: $payment})
        MERGE (order:Service {name: $order})
        MERGE (notification:Service {name: $notification})

        MERGE (event:Event {name: $event})

        MERGE (payment)-[:PUBLISHES]->(event)
        MERGE (event)-[:CONSUMED_BY]->(order)
        MERGE (order)-[:DEPENDS_ON]->(notification)

        RETURN payment, event, order, notification
      `,
      {
        payment: "Payment Service",
        order: "Order Service",
        notification: "Notification Service",
        event: "PaymentCompleted",
      },
      { routing: neo4j.routing.WRITE }
    );

    return records.map((record) => ({
      payment: record.get("payment").properties,
      event: record.get("event").properties,
      order: record.get("order").properties,
      notification: record.get("notification").properties,
    }));
  }
}
