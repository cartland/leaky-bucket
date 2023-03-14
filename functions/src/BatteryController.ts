import {EventLogDB} from "./data/EventLogDB";
import {BatteryDB} from "./data/BatteryDB";

/**
 * Control battery.
 */
export class BatteryController {
  /**
   * Create a new battery with capacity WhCapacity. Generates a new battery ID.
   *
   * @param {number} WhCapacity Battery capacity.
   */
  static async newBattery(WhCapacity: number): Promise<any> {
    const id = await BatteryDB.create();
    await BatteryDB.update(id, {id: id, WhCapacity: WhCapacity});
    await EventLogDB.log(`CREATED new battery with ID ${id} and capacity ${WhCapacity} Wh`);
    return await BatteryDB.get(id);
  }

  /**
   * Get battery info.
   *
   * @param {string} id
   */
  static async getBattery(id: string): Promise<any> {
    return await BatteryDB.get(id);
  }

  /**
   * Charge battery by a specified amount.
   *
   * @param {string} id Battery ID.
   * @param {number} addWh Energy to add.
   */
  static async chargeBattery(id: string, addWh: number): Promise<any> {
    const battery = await BatteryDB.get(id);
    const oldCharge = (!battery.WhCharge) ? 0 : battery.WhCharge;
    const newCharge = Math.min(battery.WhCapacity, oldCharge + addWh);
    const change = newCharge - oldCharge;

    await EventLogDB.log(`CHARGE battery ${battery.id}, ${change} Wh, new charge ${newCharge} Wh`);
    await BatteryDB.update(battery.id, {WhCharge: newCharge});
    return {
      WhChange: change,
      battery: await BatteryDB.get(battery.id),
    };
  }

  /**
   * Discharge battery by a specified amount.
   *
   * @param {string} id Battery ID.
   * @param {number} consumeWh Energy to consume.
   */
  static async dischargeBattery(id: string, consumeWh: number): Promise<any> {
    const battery = await BatteryDB.get(id);
    const oldCharge = (!battery.WhCharge) ? 0 : battery.WhCharge;
    const newCharge = Math.max(0, oldCharge - consumeWh);
    const change = newCharge - oldCharge;
    await EventLogDB.log(`DISCHARGE battery ${battery.id}, ${change} Wh, new charge ${newCharge} Wh`);
    await BatteryDB.update(battery.id, {WhCharge: newCharge});
    return {
      WhChange: change,
      battery: await BatteryDB.get(battery.id),
    };
  }
}
