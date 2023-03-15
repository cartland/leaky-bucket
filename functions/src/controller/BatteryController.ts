import {Battery, BATTERY_DB} from "../data/Battery";
import {EventLogDB} from "../data/EventLogDB";

interface ChargeBatteryResult {
  WhChange?: number,
  battery?: Battery,
}

/**
 * Control battery.
 */
export class BatteryController {
  /**
   * Create a new battery with capacity WhCapacity. Generates a new battery ID.
   *
   * @param {number} WhCapacity Battery capacity.
   */
  static async newBattery(WhCapacity: number): Promise<Battery | undefined> {
    const id = await BATTERY_DB.create();
    await BATTERY_DB.update(id, <Battery>{id: id, WhCapacity: WhCapacity});
    await EventLogDB.log(`CREATED new battery with ID ${id} and capacity ${WhCapacity} Wh`);
    return await BATTERY_DB.read(id);
  }

  /**
   * Get battery info.
   *
   * @param {string} id
   */
  static async getBattery(id: string): Promise<Battery | undefined> {
    return await BATTERY_DB.read(id);
  }

  /**
   * Charge battery by a specified amount.
   *
   * @param {string} id Battery ID.
   * @param {number} addWh Energy to add.
   */
  static async chargeBattery(id: string, addWh: number): Promise<ChargeBatteryResult> {
    const battery = await BATTERY_DB.read(id);
    if (!battery) {
      throw new Error("Battery does not exist");
    }
    const oldCharge = (!battery?.WhCharge) ? 0 : battery.WhCharge;
    const WhCapacity = (!battery?.WhCapacity) ? 0 : battery.WhCapacity;
    const newCharge = Math.min(WhCapacity, oldCharge + addWh);
    const change = newCharge - oldCharge;

    await EventLogDB.log(`CHARGE battery ${id}, ${change} Wh, new charge ${newCharge} Wh`);
    await BATTERY_DB.update(id, <Battery>{WhCharge: newCharge});
    return <ChargeBatteryResult>{
      WhChange: change,
      battery: await BATTERY_DB.read(id),
    };
  }

  /**
   * Discharge battery by a specified amount.
   *
   * @param {string} id Battery ID.
   * @param {number} consumeWh Energy to consume.
   */
  static async dischargeBattery(id: string, consumeWh: number): Promise<ChargeBatteryResult> {
    const battery = await BATTERY_DB.read(id);
    if (!battery) {
      throw new Error("Battery does not exist");
    }
    const oldCharge = (!battery?.WhCharge) ? 0 : battery.WhCharge;
    const newCharge = Math.max(0, oldCharge - consumeWh);
    const change = newCharge - oldCharge;
    await EventLogDB.log(`DISCHARGE battery ${id}, ${change} Wh, new charge ${newCharge} Wh`);
    await BATTERY_DB.update(id, {WhCharge: newCharge});
    return <ChargeBatteryResult>{
      WhChange: change,
      battery: await BATTERY_DB.read(id),
    };
  }
}
