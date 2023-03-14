import * as firebase from "firebase-admin";
import * as firestore from "firebase-admin/firestore";
import {converter} from "./DB";

export interface EventLog {
  description: string,
  timestamp: firestore.FieldValue | firestore.Timestamp,
}

/**
 * Log events.
 */
export class EventLogDB {
  static _ref?: firestore.CollectionReference<EventLog> = undefined;

  /**
   * Memoize Firestore reference.
   * @return {firestore.CollectionReference<EventLog>} Reference.
   */
  static ref(): firestore.CollectionReference<EventLog> {
    if (!EventLogDB._ref) {
      EventLogDB._ref = firebase.app().firestore()
        .collection("EVENTLOG").withConverter(converter<EventLog>());
    }
    return EventLogDB._ref;
  }

  /**
   * Record critical events in a log.
   *
   * @param {string} description Simple string to record in log.
   * @return {Promise<string>} ID of log entry.
   */
  static async log(description: string): Promise<string> {
    return EventLogDB.ref().add(<EventLog>{
      description: description,
      timestamp: firestore.FieldValue.serverTimestamp(),
    }).then((ref) => {
      return ref.id;
    });
  }
}
