import * as firebase from "firebase-admin";
import * as firestore from "firebase-admin/firestore";
import {converter} from "./DB";

export interface EnergyConsumer {
  id?: string,
  maxW?: number,
  activeW?: number,
  powerToken?: string,
  connectionTimeSeconds?: number,
  expireTimeUtcSeconds?: number,
  connectedBatteryId?: string,
}

/**
 * Battery database functions.
 */
export class EnergyConsumerDB {
  static _ref?: firestore.CollectionReference<EnergyConsumer> = undefined;

  /**
   * Memoize Firestore reference.
   * @return {firestore.CollectionReference<EnergyConsumer>} Reference.
   */
  static ref(): firestore.CollectionReference<EnergyConsumer> {
    if (!EnergyConsumerDB._ref) {
      EnergyConsumerDB._ref = firebase.app().firestore()
        .collection("CONSUMER").withConverter(converter<EnergyConsumer>());
    }
    return EnergyConsumerDB._ref;
  }

  /**
   * Create a new energy consumer.
   * @return {Promise<string>} ID of energy consumer.
   */
  static async create(): Promise<string> {
    return EnergyConsumerDB.ref().add({}).then((ref) => {
      return ref.id;
    });
  }

  /**
   * @param {string} id ID of energy consumer.
   * @param {object} data Fields to be updated.
   * @return {Promise<any>} Update metadata.
   */
  static async update(id: string, data: EnergyConsumer): Promise<firestore.WriteResult> {
    return EnergyConsumerDB.ref().doc(id).update(data);
  }

  /**
   * @param {string} id ID of energy consumer.
   * @return {Promise<EnergyConsumer | undefined>} Data for energy consumer.
   */
  static async get(id: string): Promise<EnergyConsumer | undefined> {
    return EnergyConsumerDB.ref().doc(id).get().then((result) => {
      return result.data();
    });
  }
}
