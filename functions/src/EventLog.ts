import * as firebase from "firebase-admin";
import * as firestore from "firebase-admin/firestore";

/**
 * Log events.
 */
export class EventLog {
  /**
   * Record critical events in a log.
   *
   * @param {string} description Simple string to record in log.
   * @return {Promise<string>} ID of log entry.
   */
  static async log(description: string): Promise<string> {
    return firebase.app().firestore().collection("EVENTLOG").add({
      description: description,
      timestamp: firestore.FieldValue.serverTimestamp(),
    }).then((ref) => {
      return ref.id;
    });
  }
}
