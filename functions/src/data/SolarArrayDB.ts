import * as firebase from "firebase-admin";
import * as firestore from "firebase-admin/firestore";
import {converter} from "./DB";

export interface SolarArray {
  id?: string,
  maxW?: number,
  activeW?: number,
  solarToken?: string,
  connectionTimeSeconds?: number,
  expireTimeUtcSeconds?: number,
  connectedBatteryId?: string,
}

/**
 * Battery database functions.
 */
export class SolarArrayDB {
  static _ref?: firestore.CollectionReference<SolarArray> = undefined;

  /**
   * Memoize Firestore reference.
   * @return {firestore.CollectionReference<SolarArray>} Reference.
   */
  static ref(): firestore.CollectionReference<SolarArray> {
    if (!SolarArrayDB._ref) {
      SolarArrayDB._ref = firebase.app().firestore()
        .collection("SOLARARRAY").withConverter(converter<SolarArray>());
    }
    return SolarArrayDB._ref;
  }

  /**
   * Create a new solar array.
   * @return {Promise<string>} ID of new solar array.
   */
  static async create(): Promise<string> {
    return SolarArrayDB.ref().add({}).then((ref) => {
      return ref.id;
    });
  }

  /**
   * @param {string} id ID of solar array.
   * @param {SolarArray} data Fields to be updated.
   */
  static async update(id: string, data: SolarArray): Promise<firestore.WriteResult> {
    return SolarArrayDB.ref().doc(id).update(data);
  }

  /**
   * @param {string} id ID of solar array.
   * @return {Promise<SolarArray | undefined>} Data for solar array.
   */
  static async get(id: string): Promise<SolarArray | undefined> {
    return SolarArrayDB.ref().doc(id).get().then((result) => {
      return result.data();
    });
  }
}
