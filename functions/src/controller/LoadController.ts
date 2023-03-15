import {EventLogDB} from "../data/EventLogDB";
import {Load, LOAD_DB} from "../data/Load";

interface SetActivePowerConsumptionResult {
  activeW?: number,
  energyConsumer?: Load,
}

/**
 * Solar array controller.
 */
export class LoadController {
  /**
   * Create a new energy consumer.
   *
   * @param {number} maxW Maximum energy consumer power.
   */
  static async newLoad(maxW: number): Promise<Load | undefined> {
    const id = await LOAD_DB.create();
    await LOAD_DB.update(id, {id: id, maxW: maxW});
    await EventLogDB.log(`CREATED new energy consumer with ID ${id} and max power ${maxW} W`);
    return await LOAD_DB.read(id);
  }

  /**
   * Get energy consumer info.
   *
   * @param {string} id
   */
  static async getEnergyConsumer(id: string): Promise<Load | undefined> {
    return await LOAD_DB.read(id);
  }

  /**
   * Set energy consumer power.
   *
   * @param {string} id
   * @param {number} activeW
   */
  static async setActivePowerConsumption(
    id: string,
    activeW: number,
  ): Promise<SetActivePowerConsumptionResult> {
    const energyConsumer = await LOAD_DB.read(id);
    if (!energyConsumer) {
      throw new Error("Energy consumer does not exist");
    }
    const maxW = (!energyConsumer?.maxW) ? 0 : energyConsumer.maxW;
    const newPower = Math.min(maxW, Math.max(0, activeW));
    await EventLogDB.log(`SET energy consumer ${id}, power ${newPower} W`);
    await LOAD_DB.update(id, {activeW: newPower});
    return <SetActivePowerConsumptionResult>{
      activeW: newPower,
      energyConsumer: await LOAD_DB.read(id),
    };
  }
}
