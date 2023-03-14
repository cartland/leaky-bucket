import * as firebase from "firebase-admin";

/**
 * Battery database functions.
 */
export class SolarArray {
  /**
   * Create a new solar array.
   * @return {Promise<string>} ID of new solar array.
   */
  static async create(): Promise<string> {
    return firebase.app().firestore().collection("SOLARARRAY").add({}).then((ref) => {
      return ref.id;
    });
  }

  /**
   * @param {string} id ID of solar array.
   * @param {object} data Fields to be updated.
   * @return {Promise<any>} Update metadata.
   */
  static async update(id: string, data: object): Promise<any> {
    return firebase.app().firestore().collection("SOLARARRAY").doc(id).update(data);
  }

  /**
   * @param {string} id ID of solar array.
   * @return {Promise<any>} Data for solar array.
   */
  static async get(id: string): Promise<any> {
    return firebase.app().firestore().collection("SOLARARRAY").doc(id).get().then((result) => {
      return result.data();
    });
  }
}
