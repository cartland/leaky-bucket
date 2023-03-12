import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";

import * as batteryFunctions from "./batteryFunctions";
import * as solarArrayFunctions from "./solarArrayFunctions";

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

export const newBattery = batteryFunctions.newBattery;
/**
 * Get battery info.
 */
export const getBattery = batteryFunctions.getBattery;

/**
 * Charge battery by a specified amount.
 */
export const chargeBattery = batteryFunctions.chargeBattery;

/**
 * Discharge battery by a specified amount.
 */
export const dischargeBattery = batteryFunctions.dischargeBattery;

// SOLAR ARRAY USAGE EXAMPLES

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/newSolarArray\?maxW\=6800
// {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki"}

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/getSolarArray\?id\=rJnbBUBaVJ4lFUsqRnki
// {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki"}

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/setActiveSolarPower\?activeW\=4000\&id\=NA5MiLuRJPbaIw954JEJ
// {"activeW": 4000, "solarArray": {"maxW": 6800, "id": "rJnbBUBaVJ4lFUsqRnki", "activeW": 4000} }

// curl -X GET https://us-central1-leaky-bucket-caa70.cloudfunctions.net/takeSolarPower\?id\=rJnbBUBaVJ4lFUsqRnki\&maxWh\=4000\&solarToken=\A

// curl -X POST https://us-central1-leaky-bucket-caa70.cloudfunctions.net/connectBatteryToSolarArray\?solarId\=rJnbBUBaVJ4lFUsqRnki\&batteryId\=abcd
//

/**
 * Create a new solar array with maximum power capacity. Generates a new ID.
 */
export const newSolarArray = solarArrayFunctions.newSolarArray;
/**
 * Get solar array info.
 */
export const getSolarArray = solarArrayFunctions.getSolarArray;

/**
 * Set active solar power.
 */
export const setActiveSolarPower = solarArrayFunctions.setActiveSolarPower;

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
export const takeSolarPower = solarArrayFunctions.httpTakeSolarPower;

/**
 * Connect a battery to a solar array.
 *
 * A solar array can only be connected to 1 battery at a time.
 */
export const connectBatteryToSolarArray = solarArrayFunctions.connectBatteryToSolarArray;

export const chargeBatteriesWithSolarArrays = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  const success = await solarArrayFunctions.chargeBatteries();
  response.send({success: success});
});

export const scheduleChargeBatteriesWithSolarArrays = functions.pubsub.
  schedule("every 5 minutes").onRun(async (_) => {
    const success = await solarArrayFunctions.chargeBatteries();
    console.log(`chargeBatteries sucess: ${success}`);
    return null;
  });
