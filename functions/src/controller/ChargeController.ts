import * as firestore from "firebase-admin/firestore";
import {BatteryController} from "./BatteryController";
import {EventLogDB} from "../data/EventLogDB";

import {ConnectionController} from "./ConnectionController";
import {PowerTransferController} from "./PowerTransferController";
import {Battery, BATTERY_DB} from "../data/Battery";
import {SolarArray, SOLAR_ARRAY_DB} from "../data/SolarArray";
import {NodeType, PowerConnection, PowerNode, TransferCapacity} from "../data/PowerConnection";
import {Load, LOAD_DB} from "../data/Load";

interface PowerStats {
  batteryChargedWithSolarCount: number,
  batteryDischargedWithLoadCount: number,
}
/**
 * Control battery.
 */
export class ChargeController {
  /**
   * Use all connections.
   */
  static async deliverPowerThroughConnections(): Promise<PowerStats> {
    const graph = await ConnectionController.createNodeGraphFromConnectionDatabase();
    let batteryChargedWithSolarCount = 0;
    let batteryDischargedWithLoadCount = 0;
    await ConnectionController.visitGraphSinksFirst(
      graph, async (node: PowerNode): Promise<boolean> => {
        if (node.type == NodeType.BATTERY && node.source?.type == NodeType.SOLAR) {
          const batterySink = await BATTERY_DB.read(node.id);
          const solarSource = await SOLAR_ARRAY_DB.read(node.source.id);
          const connection = node.sourceConnection;
          if (!(batterySink && solarSource && connection)) {
            console.error("Expecting a battery, solar array, and connection");
            return false;
          }
          const powerToken = node.sourceConnection?.powerTransferMetadata?.powerToken || "";
          chargeBatteryWithSolar(powerToken, batterySink, solarSource, connection);
          batteryChargedWithSolarCount++;
          return true;
        }
        if (node.type == NodeType.LOAD && node.source?.type == NodeType.BATTERY) {
          const loadSink = await LOAD_DB.read(node.id);
          const batterySource = await BATTERY_DB.read(node.source.id);
          const connection = node.sourceConnection;
          if (!(loadSink && batterySource && connection)) {
            console.error("Expecting a load, battery, and connection");
            return false;
          }
          const powerToken = node.sourceConnection?.powerTransferMetadata?.powerToken || "";
          dischargeBatteryWithLoad(powerToken, loadSink, batterySource, connection);
          batteryDischargedWithLoadCount++;
          return true;
        }
        return false;
      });
    const result = <PowerStats>{};
    result.batteryChargedWithSolarCount = batteryChargedWithSolarCount;
    result.batteryDischargedWithLoadCount = batteryDischargedWithLoadCount;
    return result;
  }
}

/**
 * Charge the battery with solar using the connection.
 *
 * @param {string} powerToken
 * @param {Battery} batterySink
 * @param {SolarArray} solarSource
 * @param {PowerConnection} connection
 */
async function chargeBatteryWithSolar(
  powerToken: string,
  batterySink: Battery,
  solarSource: SolarArray,
  connection: PowerConnection,
) {
  if (!connection.id) {
    console.error("Expected a connection ID");
    return;
  }
  if (!batterySink.id) {
    console.error("Expected battery to have an ID");
    return;
  }
  const capacity = <TransferCapacity>{
    powerW: Math.min(solarSource?.activeW || 0, Infinity),
    energyWh: Math.min(Infinity, (batterySink?.WhCapacity || 0) - (batterySink?.WhCharge || 0)),
  };
  const energyTransfer = PowerTransferController.calculateEnergyTransfer(
    connection.powerTransferMetadata,
    firestore.Timestamp.now().seconds,
    powerToken,
    capacity,
  );
  // Charge battery.
  await BatteryController.chargeBattery(batterySink.id, energyTransfer.energyTransferWh);
  // Save updated connection metadata.
  await ConnectionController.updateConnectionPowerTransferMetadata(
    connection.id,
    energyTransfer.metadata,
  );
  await EventLogDB.log(`TRANSFER energy with connection ${connection.id}, ` +
    `from solar ${solarSource.id}, ` +
    `to battery ${batterySink.id}, ` +
    `transferred ${energyTransfer.energyTransferWh} Wh, ` +
    `power ${energyTransfer.powerW} W, ` +
    `duration ${energyTransfer.transferDurationHours} h, ` +
    `used token ${powerToken}, ` +
    `connection UTC time ${energyTransfer.metadata.connectionTimeUtcSeconds}, ` +
    `connection UTC time ${energyTransfer.metadata.expireTimeUtcSeconds}, ` +
    `new token ${[energyTransfer.metadata.powerToken]}`);
}


/**
 * Charge the battery with solar using the connection.
 *
 * @param {string} powerToken
 * @param {Load} loadSink
 * @param {Battery} batterySource
 * @param {PowerConnection} connection
 */
async function dischargeBatteryWithLoad(
  powerToken: string,
  loadSink: Load,
  batterySource: Battery,
  connection: PowerConnection,
) {
  if (!connection.id) {
    console.error("Expected a connection ID");
    return;
  }
  if (!batterySource.id) {
    console.error("Expected battery to have an ID");
    return;
  }
  const capacity = <TransferCapacity>{
    powerW: Math.min(loadSink?.activeW || 0, Infinity),
    energyWh: Math.min(Infinity, batterySource?.WhCharge || 0),
  };
  const energyTransfer = PowerTransferController.calculateEnergyTransfer(
    connection.powerTransferMetadata,
    firestore.Timestamp.now().seconds,
    powerToken,
    capacity,
  );
  // Charge battery.
  await BatteryController.dischargeBattery(batterySource.id, energyTransfer.energyTransferWh);
  // Save updated connection metadata.
  await ConnectionController.updateConnectionPowerTransferMetadata(
    connection.id,
    energyTransfer.metadata,
  );
  await EventLogDB.log(`TRANSFER energy with connection ${connection.id}, ` +
    `from battery ${batterySource.id}, ` +
    `to load ${loadSink.id}, ` +
    `transferred ${energyTransfer.energyTransferWh} Wh, ` +
    `power ${energyTransfer.powerW} W, ` +
    `duration ${energyTransfer.transferDurationHours} h, ` +
    `used token ${powerToken}, ` +
    `connection UTC time ${energyTransfer.metadata.connectionTimeUtcSeconds}, ` +
    `connection UTC time ${energyTransfer.metadata.expireTimeUtcSeconds}, ` +
    `new token ${[energyTransfer.metadata.powerToken]}`);
}
