import {SimpleDB} from "./DB";

export interface SolarArray {
  id?: string,
  maxW?: number,
  activeW?: number,
}

export const SOLAR_ARRAY_DB = new SimpleDB<SolarArray>("SOLARARRY");
