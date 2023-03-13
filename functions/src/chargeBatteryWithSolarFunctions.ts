import * as firebase from "firebase-admin";
import * as functions from "firebase-functions";

import {Battery} from "./data/Battery";
import {EventLog} from "./data/EventLog";
import {SolarArray} from "./data/SolarArray";

import {takeSolarPower} from "./solarArrayFunctions";

/**
 * Connect battery to solar array.
 */
export const httpConnectBatteryToSolarArray = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send({error: "HTTP method not allowed"});
    return;
  }
  if (!request.query.solarId) {
    response.status(404).send({error: "Missing parameter 'solarId'"});
    return;
  }
  if (!request.query.batteryId) {
    response.status(404).send({error: "Missing parameter 'batteryId'"});
    return;
  }

  const solarArray = await SolarArray.get(request.query.solarId as string);
  const batteryId = request.query.batteryId as string;
  await EventLog.log(`CONNECT solar array ${solarArray.id} to battery ${batteryId}`);
  await SolarArray.update(solarArray.id, {connectedBatteryId: batteryId});
  response.send({
    connectedBatteryId: batteryId,
    solarArray: await SolarArray.get(solarArray.id),
  });
});

/**
 * Charge all batteries.
 */
export async function chargeBatteries(): Promise<boolean> {
  const snapshot = await firebase.app().firestore().collection("SOLARARRAY").get();
  if (snapshot.empty) {
    return true;
  }
  await snapshot.forEach(async (doc) => {
    const batteryId = doc.data().connectedBatteryId;
    const solarId = doc.id;
    if (batteryId) {
      chargeBattery(batteryId, solarId);
    }
  });
  return true;
}

/**
 * Charge a battery from a solar array.
 *
 * The battery is responsible for tracking the solarToken across multiple requests.
 *
 * @param {string} batteryId Battery will attempt to charge to maximum capacity.
 * @param {string} solarId Solar array that will handle the request for power.
 */
async function chargeBattery(batteryId: string, solarId: string) {
  const battery = await Battery.get(batteryId);

  const oldCharge = (!battery.WhCharge) ? 0 : battery.WhCharge;
  const WhCapacity = (!battery.WhCapacity) ? 0 : battery.WhCapacity;
  const maxWh = WhCapacity - oldCharge;
  const solarToken = battery.solarToken as string;

  const solarResult = await takeSolarPower(solarId, maxWh, solarToken);

  const newSolarToken = solarResult.solarToken;
  const energyAddedWh = solarResult.energyWh;
  const newCharge = oldCharge + energyAddedWh;

  await EventLog.log(`SOLAR CHARGE battery ${battery.id}, ${energyAddedWh} Wh, new charge ${newCharge} Wh, ` +
    `from solar array ${solarId}, using solar token ${solarToken}, new solar token ${newSolarToken}`);
  await Battery.update(battery.id, {
    WhCharge: newCharge,
    solarToken: newSolarToken,
  });
}
