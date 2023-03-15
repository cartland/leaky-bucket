import {EventLogDB} from "../data/EventLogDB";
import {PowerConnection, PowerGraph, PowerNode, PowerTransferMetadata, POWER_CONNECTION_DB}
  from "../data/PowerConnection";

type VisitNode = (node: PowerNode) => Promise<boolean>;

interface ConnectionGraph {
  nodes: SimpleNode[],
}

interface SimpleNode {
  id: string,
  type: string,
  sourceType: string,
  sourceId: string,
  sinkType: string,
  sinkId: string,
}

/**
 * Controls connectsion between solar, battery, and load items.
 */
export class ConnectionController {
  /**
   * Create a new connection.
   *
   * @param {PowerConnection} connection Connection.
   */
  static async newConnection(connection: PowerConnection): Promise<PowerConnection | undefined> {
    const id = await POWER_CONNECTION_DB.create();
    connection.id = id;
    await POWER_CONNECTION_DB.update(id, connection);
    await EventLogDB.log(`CREATED new connection with ID ${id} ` +
      `with source ${connection.sourceType} ${connection.sourceId} ` +
      `and sink ${connection.sinkType} ${connection.sinkId}`);
    return await POWER_CONNECTION_DB.read(id);
  }

  /**
   * Export connection graph.
   */
  static async exportConnectionGraph(): Promise<ConnectionGraph> {
    const graph = await ConnectionController.createNodeGraphFromConnectionDatabase();
    const nodes: SimpleNode[] = [];
    await ConnectionController.visitGraphSinksFirst(
      graph, async (node: PowerNode): Promise<boolean> => {
        const simpleNode = <SimpleNode>{};
        simpleNode.id = node.id;
        simpleNode.type = node.type;
        simpleNode.sourceType = node.source?.type || "";
        simpleNode.sourceId = node.source?.id || "";
        simpleNode.sinkType = node.sink?.type || "";
        simpleNode.sinkId = node.sink?.id || "";
        nodes.push(simpleNode);
        return true;
      });
    return <ConnectionGraph>{
      nodes: nodes,
    };
  }

  /**
   * Update connection metadata.
   *
   * @param {string} id  ID of the connection.
   * @param {PowerTransferMetadata} metadata Connection metadata.
   */
  static async updateConnectionPowerTransferMetadata(id: string, metadata: PowerTransferMetadata) {
    const connection = await POWER_CONNECTION_DB.read(id);
    if (!connection) {
      console.error("Cannot update a connection that does not exist");
      return;
    }
    connection.powerTransferMetadata = metadata;
    await POWER_CONNECTION_DB.update(id, connection);
  }

  /**
   * Create a node graph from the connection edges in the database.
   */
  static async createNodeGraphFromConnectionDatabase(): Promise<PowerGraph> {
    const connections = await POWER_CONNECTION_DB.readAll();
    return ConnectionController.createNodeGraph(connections);
  }

  /**
   * Visit all sinks and traverse graph.
   *
   * @param {PowerGraph} graph Graph to traverse.
   * @param {VisitNode} visit Function to execute for each node.
   */
  static async visitGraphSinksFirst(graph: PowerGraph, visit: VisitNode): Promise<boolean> {
    if (ConnectionController.detectGraphCycle(graph)) {
      console.error("Found unexpected cycle in graph");
      return false;
    }
    const visited = new Set<string>();
    const queue: PowerNode[] = [];
    queue.push(...graph.values());
    let allSuccess = true;
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      if (visited.has(current.id)) {
        continue;
      }
      if (current.sink && !visited.has(current.sink?.id)) {
        // If there is a sink that has not been visited, put current node back in the queue.
        queue.push(current);
      } else {
        // Visit the node!
        visited.add(current.id);
        const success = await visit(current);
        allSuccess = allSuccess && success;
      }
    }
    return allSuccess;
  }

  /**
   * Detect cycles in graph.
   *
   * @param {PowerGraph} graph Graph to check.
   * @return {boolean} Cycles detected.
   */
  static detectGraphCycle(graph: PowerGraph): boolean {
    for (const node of graph.values()) {
      if (ConnectionController.detectCycle(node)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect the cycle by looking throuhg sinks.
   *
   * The node graph is a doubly linked list, so we only need to check in one direction.
   * This implementation checks sinks, but we could have checked sources.
   *
   * @param {PowerNode} node Start node.
   * @return {boolean} True if a cycle is detected for this node.
   */
  static detectCycle(node: PowerNode): boolean {
    const visited = new Set<string>();
    const queue: PowerNode[] = [];
    queue.push(node);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      if (visited.has(current.id)) {
        return true;
      }
      visited.add(current.id);
      if (current.sink) {
        queue.push(current.sink);
      }
    }
    return false;
  }

  /**
   * Convert edges to nodes in the graph.
   *
   * @param {PowerConnection[]} connections Connection edges in the graph.
   * @return {PowerGraph} Graph.
   */
  static createNodeGraph(connections: PowerConnection[]): PowerGraph {
    const nodes = new PowerGraph();
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      if (!(connection.sourceId &&
        connection.sourceType &&
        connection.sinkId &&
        connection.sinkType)) {
        continue;
      }
      // We're assuming all sourceId and sinkId values are unique.
      // Technically, the source and sink IDs are generated values in different namespaces,
      // so there could be an overlap. In practice, this is statistically unlikely
      // and "good enough" for our use case.
      if (!nodes.has(connection.sourceId)) {
        nodes.set(connection.sourceId, <PowerNode>{
          type: connection.sourceType,
          id: connection.sourceId,
          source: undefined,
          sink: undefined,
        });
      }
      if (!nodes.has(connection.sinkId)) {
        nodes.set(connection.sinkId, <PowerNode>{
          type: connection.sinkType,
          id: connection.sinkId,
          source: undefined,
          sink: undefined,
        });
      }
      const source = nodes.get(connection.sourceId);
      const sink = nodes.get(connection.sinkId);
      if (!(source && sink)) {
        console.error("Source and sink did not get saved");
        continue;
      }
      source.sink = sink;
      source.sinkConnection = connection;
      sink.source = source;
      sink.sourceConnection = connection;
    }
    return nodes;
  }
}
