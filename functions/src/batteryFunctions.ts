import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";


/**
 * Create a new battery with capacity WhCapacity. Generates a new battery ID.
 */
export const newBattery = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (!request.query.WhCapacity) {
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
  if (!request.query.id) {
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
  if (!request.query.id) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  if (!request.query.addWh) {
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
  const oldCharge = (!battery.WhCharge) ? 0 : battery.WhCharge;
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
  if (!request.query.id) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  if (!request.query.consumeWh) {
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
  const oldCharge = (!battery.WhCharge) ? 0 : battery.WhCharge;
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
