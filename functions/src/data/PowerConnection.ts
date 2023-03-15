
import {SimpleDB} from "./DB";

export const POWER_CONNECTION_DB = new SimpleDB<PowerConnection>("POWERCONNECTION");

export interface PowerConnection {
  id?: string,
  sourceId?: string,
  sourceType?: NodeType,
  sinkId?: string,
  sinkType?: NodeType,
  powerTransferMetadata?: PowerTransferMetadata,
}

export interface PowerTransferMetadata {
  powerToken?: string,
  connectionTimeUtcSeconds?: number,
  expireTimeUtcSeconds?: number,
}

/**
 * Create an explicitly typed class of Map.
 */
export class PowerGraph extends Map<string, PowerNode> {
  /**
   * Call constructor.
   */
  constructor() {
    super();
  }
}

export enum NodeType {
  BATTERY = "BATTERY",
  SOLAR = "SOLAR",
  LOAD = "LOAD",
}

export interface PowerNode {
  type: string,
  id: string,
  source?: PowerNode,
  sourceConnection?: PowerConnection,
  sink?: PowerNode,
  sinkConnection?: PowerConnection,
}

export interface PowerSource {
  powerW: number,
  sourceMaxWh: number,
}

export interface PowerSink {
  powerW: number,
  sinkMaxWh: number,
}

export interface TransferCapacity {
  powerW: number,
  energyWh: number,
}

export interface EnergyTransfer {
  energyTransferWh: number,
  transferDurationHours: number,
  powerW: number,
  metadata: PowerTransferMetadata,
}
