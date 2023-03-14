import * as firebase from "firebase-admin";

/**
 * Battery database functions.
 */
export class EnergyConsumer {
  /**
   * Create a new energy consumer.
   * @return {Promise<string>} ID of energy consumer.
   */
  static async create(): Promise<string> {
    return firebase.app().firestore().collection("CONSUMER").add({}).then((ref) => {
      return ref.id;
    });
  }

  /**
   * @param {string} id ID of energy consumer.
   * @param {object} data Fields to be updated.
   * @return {Promise<any>} Update metadata.
   */
  static async update(id: string, data: object): Promise<any> {
    return firebase.app().firestore().collection("CONSUMER").doc(id).update(data);
  }

  /**
   * @param {string} id ID of energy consumer.
   * @return {Promise<any>} Data for energy consumer.
   */
  static async get(id: string): Promise<any> {
    return firebase.app().firestore().collection("CONSUMER").doc(id).get().then((result) => {
      return result.data();
    });
  }
}
