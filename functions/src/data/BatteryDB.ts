import * as firebase from "firebase-admin";
import * as firestore from "firebase-admin/firestore";
import {converter} from "./DB";

export interface Battery {
  id?: string,
  WhCapacity?: number,
  WhCharge?: number,
  powerToken?: string,
  solarToken?: string,
}

/**
 * Battery database functions.
 */
export class BatteryDB {
  static _ref?: firestore.CollectionReference<Battery> = undefined;

  /**
   * Memoize Firestore reference.
   * @return {firestore.CollectionReference<Battery>} Reference.
   */
  static ref(): firestore.CollectionReference<Battery> {
    if (!BatteryDB._ref) {
      BatteryDB._ref = firebase.app().firestore()
        .collection("BATTERIES").withConverter(converter<Battery>());
    }
    return BatteryDB._ref;
  }

  /**
   * Create a new battery.
   * @return {Promise<string>} ID of new battery.
   */
  static async create(): Promise<string> {
    return BatteryDB.ref().add({}).then((ref) => {
      return ref.id;
    });
  }

  /**
   * @param {string} id ID of battery.
   * @param {object} data Fields to be updated.
   * @return {Promise<any>} Update metadata.
   */
  static async update(id: string, data: Battery): Promise<firestore.WriteResult> {
    return BatteryDB.ref().doc(id).update(data);
  }

  /**
   * @param {string} id ID of battery.
   * @return {Promise<Battery | undefined>} Data for battery.
   */
  static async get(id: string): Promise<Battery | undefined> {
    return BatteryDB.ref().doc(id).get().then((result) => {
      return result.data();
    });
  }
}
