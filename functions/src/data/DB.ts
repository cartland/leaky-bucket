import * as firebase from "firebase-admin";
import {firestore} from "firebase-admin";
import {DocumentData, FirestoreDataConverter, UpdateData} from "firebase-admin/firestore";

/**
 * Convert Firestore documents automatically.
 *
 * @return {FireStoreDataConverter<T>} Converter.
 */
export function converter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data as DocumentData,
    fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => snap.data() as T,
  };
}

/**
 * SimpleDB with CRUD operations.
 */
export class SimpleDB<T> {
  private _ref: firestore.CollectionReference<T>;

  /**
   * Create a database reference for this path.
   *
   * @param {string} collectionPath Location of the data.
   */
  constructor(collectionPath: string) {
    this._ref = firebase.app().firestore()
      .collection(collectionPath).withConverter(converter<T>());
  }

  /**
   * Create.
   */
  async create(): Promise<string> {
    return this._ref.add(<T>{}).then((ref) => {
      return ref.id;
    });
  }

  /**
   * Read.
   *
   * @param {string} id ID of the item.
   */
  async read(id: string): Promise<T | undefined> {
    return this._ref.doc(id).get().then((docSnapshot) => {
      return docSnapshot.data();
    });
  }

  /**
   * Read all.
   */
  async readAll(): Promise<T[]> {
    return this._ref.get().then((snapshot) => {
      const result = [...snapshot.docs.values()].map<T>((docSnapshot): T => {
        return docSnapshot.data();
      });
      return result;
    });
  }

  /**
   * Update.
   *
   * @param {string} id ID of the data to update.
   * @param {T} data Data to update.
   */
  async update(id: string, data: T): Promise<firestore.WriteResult> {
    return this._ref.doc(id).update(data as UpdateData<T>);
  }

  /**
   * Delete.
   *
   * @param {string} id ID to delete.
   */
  async delete(id: string): Promise<firestore.WriteResult> {
    return this._ref.doc(id).delete();
  }

  /**
   * Simple "where" clause to read data.
   *
   * @param {string} fieldPath Field to check.
   * @param {firestore.WhereFilterOp} opStr Operation.
   * @param {any} value Value used in search.
   */
  async where(
    fieldPath: string | firestore.FieldPath,
    opStr: firestore.WhereFilterOp,
    value: object,
  ): Promise<T[]> {
    const snapshot = await this._ref.where(fieldPath, opStr, value).get();
    const result = [...snapshot.docs.values()].map<T>((docSnapshot): T => {
      return docSnapshot.data();
    });
    return result;
  }
}
