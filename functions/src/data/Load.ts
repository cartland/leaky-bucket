import {SimpleDB} from "./DB";

export interface Load {
  id?: string,
  maxW?: number,
  activeW?: number,
}

export const LOAD_DB = new SimpleDB<Load>("LOAD");
