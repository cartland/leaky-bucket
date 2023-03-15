import {SimpleDB} from "./DB";

export interface Battery {
  id?: string,
  WhCapacity?: number,
  WhCharge?: number,
}

export const BATTERY_DB = new SimpleDB<Battery>("BATTERY");
