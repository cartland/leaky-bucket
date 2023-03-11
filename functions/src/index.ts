import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";

firebase.initializeApp();

// BATTERY USAGE EXAMPLES

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/newBattery\?WhCapacity\=75000
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy"}

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/getBattery\?id\=NBi0dEvaSBinEFnb1eAy
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy"}

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/chargeBattery\?id\=NBi0dEvaSBinEFnb1eAy\&addWh\=47
// {"WhChange": 47, "battery":
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy", "WhCharge": 47} }

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/chargeBattery\?id\=NBi0dEvaSBinEFnb1eAy\&addWh\=47
// {"WhChange": 47, "battery":
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy", "WhCharge": 94} }

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/dischargeBattery\?id\=NBi0dEvaSBinEFnb1eAy\&consumeWh\=83
// {"WhChange": -83, "battery":
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy", "WhCharge": 11} }

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/dischargeBattery\?id\=NBi0dEvaSBinEFnb1eAy\&consumeWh\=83
// {"WhChange": -11, "battery":
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy", "WhCharge": 0} }

/**
 * Create a new battery with capacity WhCapacity. Generates a new battery ID.
 */
export const newBattery = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (request.query.WhCapacity === undefined) {
    response.status(404).send({error: "Missing parameter 'WhCapacity'"});
    return;
  }
  const WhCapacity = parseFloat(request.query.WhCapacity as string);
  if (Number.isNaN(WhCapacity)) {
    response.status(404).send({error: "'WhCapacity' must be a number"});
    return;
  }
  const id = await Battery.create();
  await Battery.update(id, {id: id, WhCapacity: WhCapacity});
  response.send(await Battery.get(id));
});

/**
 * Get battery info.
 */
export const getBattery = functions.https.onRequest(async (request, response) => {
  if (request.method !== "GET") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (request.query.id === undefined) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  response.send(await Battery.get(request.query.id as string));
});

/**
 * Charge battery by a specified amount.
 */
export const chargeBattery = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (request.query.id === undefined) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  if (request.query.addWh === undefined) {
    response.status(404).send({error: "Missing parameter 'addWh'"});
    return;
  }
  const addWh = parseFloat(request.query.addWh as string);
  if (Number.isNaN(addWh)) {
    response.status(404).send({error: "'addWh' must be a number"});
    return;
  }
  if (addWh < 0) {
    response.status(404).send({error: "'addWh' must not be negative"});
    return;
  }

  const battery = await Battery.get(request.query.id as string);
  const oldCharge = (typeof battery.WhCharge === "undefined") ? 0 : battery.WhCharge;
  const newCharge = Math.min(battery.WhCapacity, oldCharge + addWh);
  const change = newCharge - oldCharge;

  await Battery.update(battery.id, {WhCharge: newCharge});
  response.send({
    WhChange: change,
    battery: await Battery.get(battery.id),
  });
});

/**
 * Discharge battery by a specified amount.
 */
export const dischargeBattery = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (request.query.id === undefined) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  if (request.query.consumeWh === undefined) {
    response.status(404).send({error: "Missing parameter 'consumeWh'"});
    return;
  }
  const consumeWh = parseFloat(request.query.consumeWh as string);
  if (Number.isNaN(consumeWh)) {
    response.status(404).send({error: "'consumeWh' must be a number"});
    return;
  }
  if (consumeWh < 0) {
    response.status(404).send({error: "'consumeWh' must not be negative"});
    return;
  }

  const battery = await Battery.get(request.query.id as string);
  const oldCharge = (typeof battery.WhCharge === "undefined") ? 0 : battery.WhCharge;
  const newCharge = Math.max(0, oldCharge - consumeWh);
  const change = newCharge - oldCharge;

  await Battery.update(battery.id, {WhCharge: newCharge});
  response.send({
    WhChange: change,
    battery: await Battery.get(battery.id),
  });
});


/**
 * Battery database functions.
 */
class Battery {
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
