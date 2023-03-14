import * as firebase from "firebase-admin";

import {BatteryDB} from "./data/BatteryDB";
import {EnergyConsumerDB} from "./data/EnergyConsumerDB";
import {EventLogDB} from "./data/EventLogDB";
import {EnergyConsumerController} from "./EnergyConsumerController";

/**
 * Consumer battery controller.
 */
export class ConsumeBatteryController {
  /**
   * Connect energy consumer to battery.
   *
   * @param {string} energyConsumerId Energy consumer ID.
   * @param {string} batteryId Battery ID.
   */
  static async connectEnergyConsumerToBattery(energyConsumerId: string, batteryId: string): Promise<any> {
    await EventLogDB.log(`CONNECT energy consumer ${energyConsumerId} to battery ${batteryId}`);
    await EnergyConsumerDB.update(energyConsumerId, {connectedBatteryId: batteryId});
    return {
      connectedBatteryId: batteryId,
      energyConsumer: await EnergyConsumerDB.get(energyConsumerId),
    };
  }

  /**
   * Consumer energy from all batteries.
   */
  static async consumeEnergyFromAllBatteries(): Promise<boolean> {
    const snapshot = await firebase.app().firestore().collection("CONSUMER").get();
    if (snapshot.empty) {
      return true;
    }
    await snapshot.forEach(async (doc) => {
      const batteryId = doc.data().connectedBatteryId;
      const energyConsumerId = doc.id;
      if (batteryId) {
        ConsumeBatteryController.consumeEnergyFromBattery(energyConsumerId, batteryId);
      }
    });
    return true;
  }

  /**
   * Drain a battery from an energy consumer.
   *
   * The battery is responsible for tracking the power token across multiple requests.
   *
   * @param {string} energyConsumerId Energy consumer ID.
   * @param {string} batteryId Battery will deliver power until it is empty.
   */
  static async consumeEnergyFromBattery(energyConsumerId: string, batteryId: string) {
    const battery = await BatteryDB.get(batteryId);

    const oldChargeWh = (!battery.WhCharge) ? 0 : battery.WhCharge;
    const maxEnergyRequestedWh = oldChargeWh;
    const powerToken = battery.powerToken as string;

    const consumerResult = await EnergyConsumerController.takePower(energyConsumerId, maxEnergyRequestedWh, powerToken);

    const newPowerToken = consumerResult.powerToken;
    const energyTakenWh = consumerResult.energyWh;
    const newCharge = Math.max(0, oldChargeWh - energyTakenWh);
    const energyTakenFromBatteryWh = oldChargeWh - newCharge; // Should match energy taken.

    await EventLogDB.log(`CONSUME energy from battery ${batteryId}, ${energyTakenFromBatteryWh} Wh, new charge ${newCharge} Wh, ` +
      `to energy consumer ${energyConsumerId}, using power token ${powerToken}, new power token ${newPowerToken}`);
    await BatteryDB.update(batteryId, {
      WhCharge: newCharge,
      powerToken: newPowerToken,
    });
  }
}
