import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";

firebase.initializeApp();

import {BatteryController} from "./controller/BatteryController";
import {SolarArrayController} from "./controller/SolarArrayController";
import {LoadController} from "./controller/LoadController";
import {ConnectionController} from "./controller/ConnectionController";
import {NodeType, PowerConnection} from "./data/PowerConnection";
import {ChargeController} from "./controller/ChargeController";

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
  response.send(await BatteryController.getBattery(request.query.id as string));
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
  response.send(await SolarArrayController.getSolarArray(request.query.id as string));
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

// CONNECTION USAGE EXAMPLES

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/connectBatteryToSolarArray\?solarId\=rJnbBUBaVJ4lFUsqRnki\&batteryId\=MzeVxY0YYGQDS02PgePn
// {"sourceId": "rJnbBUBaVJ4lFUsqRnki", "sourceType": "SOLAR", "sinkId": "MzeVxY0YYGQDS02PgePn", "id": "ZVBw5PwQgtR7Azw4evd5", "sinkType": "BATTERY"}%

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/exportConnectionGraph
// {"nodes": [{"id": "Kc4M8vIvt6UTOsnbRjOp", "type": "BATTERY", "sourceType": "SOLAR", "sourceId": "z1WEwtSRajLlb12AzQo9", "sinkType": "", "sinkId": ""},
// {"id": "z1WEwtSRajLlb12AzQo9", "type": "SOLAR", "sourceType": "", "sourceId": "", "sinkType": "BATTERY", "sinkId": "Kc4M8vIvt6UTOsnbRjOp"}]}

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
  const connection = <PowerConnection>{};
  connection.sinkType = NodeType.BATTERY;
  connection.sinkId = batteryId; // TODO: Delete connections with this sink ID.
  connection.sourceType = NodeType.SOLAR;
  connection.sourceId = solarId; // TODO: Delete connections with this source ID.
  response.send(await ConnectionController.newConnection(connection));
});

/**
 * Export graph.
 */
export const exportConnectionGraph = functions.https.onRequest(async (request, response) => {
  if (request.method !== "GET") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  response.send(await ConnectionController.exportConnectionGraph());
});

// LOAD USAGE EXAMPLES

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/newLoad\?maxW\=1000
// {"maxW": 1000, "id": "NA5MiLuRJPbaIw954JEJ"}

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/getLoad\?id\=NA5MiLuRJPbaIw954JEJ
// {"maxW": 1000, "id": "NA5MiLuRJPbaIw954JEJ"}

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/setLoadPower\?activeW\=500\&id\=NA5MiLuRJPbaIw954JEJ
// {"activeW": 500, "energyConsumer": {"maxW": 1000, "id": "NA5MiLuRJPbaIw954JEJ", "activeW": 500} }

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/connectLoadToBattery\?loadId\=NA5MiLuRJPbaIw954JEJ\&batteryId\=MzeVxY0YYGQDS02PgePn
// {"sourceId": "MzeVxY0YYGQDS02PgePn", "sourceType": "BATTERY", "sinkId": "NA5MiLuRJPbaIw954JEJ", "id": "BtgYJX4bocGklKrmy1Yh", "sinkType": "LOAD"}%                                                                                                   ➜  leaky - bucket git: (main) ✗ curl - X POST http://127.0.0.1:5001/leaky-bucket-caa70/us-central1/deliverPowerThroughConnections

/**
 * Create a new energy consumer.
 */
export const newLoad = functions.https.onRequest(async (request, response) => {
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
  response.send(await LoadController.newLoad(maxW));
});

/**
 * Get energy consumer info.
 */
export const getLoad = functions.https.onRequest(async (request, response) => {
  if (request.method !== "GET") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (!request.query.id) {
    response.status(404).send({error: "Missing parameter 'id'"});
    return;
  }
  response.send(await LoadController.getEnergyConsumer(request.query.id as string));
});

/**
 * Set active power consumption.
 */
export const setLoadPower = functions.https.onRequest(async (request, response) => {
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
  response.send(await LoadController.setActivePowerConsumption(request.query.id as string, activeW));
});

/**
 * Connect a load to a battery.
 */
export const connectLoadToBattery = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  const loadId = request.query.loadId as string;
  if (!loadId) {
    response.status(404).send({error: "Missing parameter 'loadId'"});
    return;
  }
  const batteryId = request.query.batteryId as string;
  if (!batteryId) {
    response.status(404).send({error: "Missing parameter 'batteryId'"});
    return;
  }
  const connection = <PowerConnection>{};
  connection.sinkType = NodeType.LOAD;
  connection.sinkId = loadId;
  connection.sourceType = NodeType.BATTERY;
  connection.sourceId = batteryId;
  response.send(await ConnectionController.newConnection(connection));
});

// DELIVER POWER

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/deliverPowerThroughConnections

export const deliverPowerThroughConnections = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  response.send(await ChargeController.deliverPowerThroughConnections());
});

export const scheduleRunPowerThroughConnections = functions.pubsub.
  schedule("every 5 minutes").onRun(async () => {
    const stats = await ChargeController.deliverPowerThroughConnections();
    console.log(`PowerStats: ${stats}`);
    return null;
  });
