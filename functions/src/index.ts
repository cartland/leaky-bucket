import * as firebase from "firebase-admin";
import * as firestore from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import {v4 as uuidv4} from "uuid";

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

// SOLAR ARRAY USAGE EXAMPLES

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/newSolarArray\?maxW\=6800
// {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki"}

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/getSolarArray\?id\=rJnbBUBaVJ4lFUsqRnki
// {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki"}

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/setActiveSolarPower\?id\=rJnbBUBaVJ4lFUsqRnki\&activeW\=4000
// {"activeW": 4000, "solarArray": {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki", "activeW": 4000} }

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/takeSolarPower\?id\=rJnbBUBaVJ4lFUsqRnki\&maxWh\=4000\&solarToken=\A

/**
 * Create a new solar array with maximum power capacity. Generates a new ID.
 */
export const newSolarArray = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (!request.query.maxW) {
    response.status(404).send({error: "Missing parameter 'maxW'"});
    return;
  }
  const maxW = parseFloat(request.query.maxW as string);
  if (Number.isNaN(maxW)) {
    response.status(404).send({error: "'maxW' must be a number"});
    return;
  }
  const id = await SolarArray.create();
  await SolarArray.update(id, {id: id, maxW: maxW});
  response.send(await SolarArray.get(id));
});

/**
 * Get solar array info.
 */
export const getSolarArray = functions.https.onRequest(async (request, response) => {
  if (request.method !== "GET") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (!request.query.id) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  response.send(await SolarArray.get(request.query.id as string));
});

/**
 * Set active solar power.
 */
export const setActiveSolarPower = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (!request.query.id) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  if (!request.query.activeW) {
    response.status(404).send({error: "Missing parameter 'activeW'"});
    return;
  }
  const activeW = parseFloat(request.query.activeW as string);
  if (Number.isNaN(activeW)) {
    response.status(404).send({error: "'activeW' must be a number"});
    return;
  }

  const solarArray = await SolarArray.get(request.query.id as string);
  const newPower = Math.min(solarArray.maxW, Math.max(0, activeW));
  await SolarArray.update(solarArray.id, {activeW: newPower});
  response.send({
    activeW: newPower,
    solarArray: await SolarArray.get(solarArray.id),
  });
});

/**
 * Attempt to take energy from solar array.
 *
 * Energy is delivered over time (multiple requests). The first request will always return 0 Wh.
 * Each response will contain a solar array token. Each token cannot be used more than once.
 * The token will have an expiration time. After the expiration, no energy can be withdrawn.
 * If a token is used before the expiration time, energy will be withdrawn.
 *
 * Energy (Wh) = Power (W) * Time Since Token Creation (h)
 *
 * takeSolarPower(no token)
 * -> Wh: 0, Token: A, Expires: 5 minutes
 * takeSolarPower(A)
 * -> Wh: 14, Token: B, Expires: 5 minutes
 * takeSolarPower(B)
 * -> Wh: 18, Token: C, Expires: 5 minutes
 * [Wait past expiration]
 * takeSolarPower(C)
 * -> Wh: 0, Token: D, Expires: 5 minutes
 */
export const takeSolarPower = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (!request.query.id) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  if (!request.query.maxWh) {
    response.status(404).send({error: "Missing parameter 'maxWh'"});
    return;
  }
  const maxWh = parseFloat(request.query.maxWh as string);
  if (Number.isNaN(maxWh)) {
    response.status(404).send({error: "'maxWh' must be a number"});
    return;
  }
  if (maxWh < 0) {
    response.status(404).send({error: "'maxWh' must not be negative"});
    return;
  }

  // Calculate new values.
  const newSolarToken = uuidv4();
  const now = firestore.Timestamp.now();
  const expireDurationSeconds = 5 * 60;
  const newExpireTimeSeconds = now.seconds + expireDurationSeconds;

  // Calculate potential energy delivered.
  const solarArray = await SolarArray.get(request.query.id as string);
  const powerDurationHours = (now.seconds - solarArray.connectionTimeSeconds) / (60.0 * 60.0);
  const activeW = (!solarArray.activeW) ? 0 : solarArray.activeW;
  let energyWh = activeW * powerDurationHours;
  let note = "";

  // Constrain energy delivered.
  if (now.seconds > solarArray.expireTimeUtcSeconds) {
    energyWh = 0; // Expired.
    note = "Disconnected. Connection expired.";
  }
  if (!solarArray.solarToken) {
    energyWh = 0; // No old token.
    note = "Turning on solar array (array was not online)";
  } else if (!request.query.solarToken) {
    energyWh = 0; // No token provided.
    note = "New solar array connection (no token)";
  } else if (request.query.solarToken != solarArray.solarToken) {
    energyWh = 0; // Mismatched token.
    note = "Bad solar array connection (wrong token)";
  }
  energyWh = Math.min(energyWh, maxWh);

  await SolarArray.update(solarArray.id, {
    solarToken: newSolarToken,
    connectionTimeSeconds: now.seconds,
    expireTimeUtcSeconds: newExpireTimeSeconds,
  });
  response.send({
    solarToken: newSolarToken,
    expireTimeUtcSeconds: newExpireTimeSeconds,
    energyWh: energyWh,
    powerDurationHours: powerDurationHours,
    activeW: activeW,
    note: note,
    solarArray: await SolarArray.get(solarArray.id),
  });
});


/**
 * Battery database functions.
 */
class SolarArray {
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
   * @param {string} id ID of battery.
   * @return {Promise<any>} Data for battery.
   */
  static async get(id: string): Promise<any> {
    return firebase.app().firestore().collection("SOLARARRAY").doc(id).get().then((result) => {
      return result.data();
    });
  }
}
