import * as firebase from "firebase-admin";

/**
 * Battery database functions.
 */
export class Battery {
  /**
   * Create a new battery.
   * @return {Promise<string>} ID of new battery.
   */
  static async create(): Promise<string> {
    return firebase.app().firestore().collection("BATTERIES").add({}).then((ref) => {
      return ref.id;
    });
  }

  /**
   * @param {string} id ID of battery.
   * @param {object} data Fields to be updated.
   * @return {Promise<any>} Update metadata.
   */
  static async update(id: string, data: object): Promise<any> {
    return firebase.app().firestore().collection("BATTERIES").doc(id).update(data);
  }

  /**
   * @param {string} id ID of battery.
   * @return {Promise<any>} Data for battery.
   */
  static async get(id: string): Promise<any> {
    return firebase.app().firestore().collection("BATTERIES").doc(id).get().then((result) => {
      return result.data();
    });
  }
}
