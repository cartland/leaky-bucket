import * as firebase from "firebase-admin";

import {BatteryDB} from "./data/Battery";
import {EventLogDB} from "./data/EventLog";
import {SolarArrayDB} from "./data/SolarArray";

import {SolarArrayController} from "./SolarArrayController";

/**
 * Solar battery charge controller.
 */
export class SolarBatteryChargeController {
  /**
   * Connect battery to solar array.
   *
   * @param {string} batteryId Battery ID.
   * @param {string} solarId Solar array ID.
   */
  static async connectBatteryToSolarArray(batteryId: string, solarId: string): Promise<any> {
    await EventLogDB.log(`CONNECT solar array ${solarId} to battery ${batteryId}`);
    await SolarArrayDB.update(solarId, {connectedBatteryId: batteryId});
    return {
      connectedBatteryId: batteryId,
      solarArray: await SolarArrayDB.get(solarId),
    };
  }

  /**
   * Charge all batteries.
   */
  static async solarChargeAllBatteries(): Promise<boolean> {
    const snapshot = await firebase.app().firestore().collection("SOLARARRAY").get();
    if (snapshot.empty) {
      return true;
    }
    await snapshot.forEach(async (doc) => {
      const batteryId = doc.data().connectedBatteryId;
      const solarId = doc.id;
      if (batteryId) {
        SolarBatteryChargeController.solarChargeBattery(batteryId, solarId);
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
  static async solarChargeBattery(batteryId: string, solarId: string) {
    const battery = await BatteryDB.get(batteryId);

    const oldCharge = (!battery.WhCharge) ? 0 : battery.WhCharge;
    const WhCapacity = (!battery.WhCapacity) ? 0 : battery.WhCapacity;
    const maxWh = WhCapacity - oldCharge;
    const solarToken = battery.solarToken as string;

    const solarResult = await SolarArrayController.takeSolarPower(solarId, maxWh, solarToken);

    const newSolarToken = solarResult.solarToken;
    const energyAddedWh = solarResult.energyWh;
    const newCharge = oldCharge + energyAddedWh;

    await EventLogDB.log(`SOLAR CHARGE battery ${batteryId}, ${energyAddedWh} Wh, new charge ${newCharge} Wh, ` +
      `from solar array ${solarId}, using solar token ${solarToken}, new solar token ${newSolarToken}`);
    await BatteryDB.update(batteryId, {
      WhCharge: newCharge,
      solarToken: newSolarToken,
    });
  }
}
