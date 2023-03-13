import {EventLog} from "./data/EventLog";
import {Battery} from "./data/Battery";

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
    const id = await Battery.create();
    await Battery.update(id, {id: id, WhCapacity: WhCapacity});
    await EventLog.log(`CREATED new battery with ID ${id} and capacity ${WhCapacity} Wh`);
    return await Battery.get(id);
  }

  /**
   * Get battery info.
   *
   * @param {string} id
   */
  static async getBattery(id: string): Promise<any> {
    return await Battery.get(id);
  }

  /**
   * Charge battery by a specified amount.
   *
   * @param {string} id Battery ID.
   * @param {number} addWh Energy to add.
   */
  static async chargeBattery(id: string, addWh: number): Promise<any> {
    const battery = await Battery.get(id);
    const oldCharge = (!battery.WhCharge) ? 0 : battery.WhCharge;
    const newCharge = Math.min(battery.WhCapacity, oldCharge + addWh);
    const change = newCharge - oldCharge;

    await EventLog.log(`CHARGE battery ${battery.id}, ${change} Wh, new charge ${newCharge} Wh`);
    await Battery.update(battery.id, {WhCharge: newCharge});
    return {
      WhChange: change,
      battery: await Battery.get(battery.id),
    };
  }

  /**
   * Discharge battery by a specified amount.
   *
   * @param {string} id Battery ID.
   * @param {number} consumeWh Energy to consume.
   */
  static async dischargeBattery(id: string, consumeWh: number): Promise<any> {
    const battery = await Battery.get(id);
    const oldCharge = (!battery.WhCharge) ? 0 : battery.WhCharge;
    const newCharge = Math.max(0, oldCharge - consumeWh);
    const change = newCharge - oldCharge;
    await EventLog.log(`DISCHARGE battery ${battery.id}, ${change} Wh, new charge ${newCharge} Wh`);
    await Battery.update(battery.id, {WhCharge: newCharge});
    return {
      WhChange: change,
      battery: await Battery.get(battery.id),
    };
  }
}
