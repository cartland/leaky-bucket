import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";

import {BatteryController} from "./BatteryController";
import {SolarBatteryChargeController} from "./SolarBatteryChargeController";
import {SolarArrayController} from "./SolarArrayController";

firebase.initializeApp();

// BATTERY USAGE EXAMPLES

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/newBattery\?WhCapacity\=75000
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy"}

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/getBattery\?id\=NBi0dEvaSBinEFnb1eAy
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy"}

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/chargeBattery\?addWh\=47\&id\=NBi0dEvaSBinEFnb1eAy
// {"WhChange": 47, "battery":
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy", "WhCharge": 47} }

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/chargeBattery\?addWh\=47\&id\=NBi0dEvaSBinEFnb1eAy
// {"WhChange": 47, "battery":
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy", "WhCharge": 94} }

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/dischargeBattery\?consumeWh\=83\&id\=NBi0dEvaSBinEFnb1eAy
// {"WhChange": -83, "battery":
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy", "WhCharge": 11} }

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/dischargeBattery\?consumeWh\=83\&id\=NBi0dEvaSBinEFnb1eAy
// {"WhChange": -11, "battery":
// {"WhCapacity": 75000, "id": "NBi0dEvaSBinEFnb1eAy", "WhCharge": 0} }

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
  if (WhCapacity < 0) {
    response.status(404).send({error: "'WhCapacity' must not be negative"});
    return;
  }
  response.send(await BatteryController.newBattery(WhCapacity));
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
  response.send(BatteryController.getBattery(request.query.id as string));
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
  response.send(await BatteryController.chargeBattery(request.query.id as string, addWh));
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
  response.send(await BatteryController.dischargeBattery(request.query.id as string, consumeWh));
});

// SOLAR ARRAY USAGE EXAMPLES

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/newSolarArray\?maxW\=6800
// {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki"}

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/getSolarArray\?id\=rJnbBUBaVJ4lFUsqRnki
// {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki"}

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/setActiveSolarPower\?activeW\=4000\&id\=NA5MiLuRJPbaIw954JEJ
// {"activeW": 4000, "solarArray": {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki", "activeW": 4000} }

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/takeSolarPower\?id\=rJnbBUBaVJ4lFUsqRnki\&maxWh\=4000\&solarToken=\A

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/connectBatteryToSolarArray\?solarId\=rJnbBUBaVJ4lFUsqRnki\&batteryId\=MzeVxY0YYGQDS02PgePn
// {"connectedBatteryId": "MzeVxY0YYGQDS02PgePn", "solarArray":
//   {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki", "activeW": 4000, "connectedBatteryId": "MzeVxY0YYGQDS02PgePn"} }

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/chargeBatteriesWithSolarArrays

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
  if (maxW < 0) {
    response.status(404).send({error: "'maxW' must not be negative"});
    return;
  }
  response.send(await SolarArrayController.newSolarArray(maxW));
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
  response.send(SolarArrayController.getSolarArray(request.query.id as string));
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
  response.send(await SolarArrayController.setActiveSolarPower(request.query.id as string, activeW));
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
  const id = request.query.id as string;
  const maxWh = request.query.maxWh as string;
  const solarToken = request.query.solarToken as string;
  if (!id) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  if (!maxWh) {
    response.status(404).send({error: "Missing parameter 'maxWh'"});
    return;
  }
  const maxWhFloat = parseFloat(maxWh);
  if (Number.isNaN(maxWhFloat)) {
    response.status(404).send({error: "'maxWh' must be a number"});
    return;
  }
  if (maxWhFloat < 0) {
    response.status(404).send({error: "'maxWh' must not be negative"});
    return;
  }
  response.send(await SolarArrayController.takeSolarPower(id, maxWhFloat, solarToken));
});


/**
 * Connect a battery to a solar array.
 *
 * A solar array can only be connected to 1 battery at a time.
 */
export const connectBatteryToSolarArray = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  const solarId = request.query.solarId as string;
  if (!solarId) {
    response.status(404).send({error: "Missing parameter 'solarId'"});
    return;
  }
  const batteryId = request.query.batteryId as string;
  if (!batteryId) {
    response.status(404).send({error: "Missing parameter 'batteryId'"});
    return;
  }
  response.send(await SolarBatteryChargeController.connectBatteryToSolarArray(batteryId, solarId));
});

export const chargeBatteriesWithSolarArrays = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  const success = await SolarBatteryChargeController.solarChargeAllBatteries();
  response.send({success: success});
});

export const scheduleChargeBatteriesWithSolarArrays = functions.pubsub.
  schedule("every 5 minutes").onRun(async (_) => {
    const success = await SolarBatteryChargeController.solarChargeAllBatteries();
    console.log(`chargeBatteries sucess: ${success}`);
    return null;
  });
