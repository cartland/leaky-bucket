import {EventLogDB} from "../data/EventLogDB";
import {SolarArray, SOLAR_ARRAY_DB} from "../data/SolarArray";

interface SetActiveSolarPowerResult {
  activeW?: number,
  solarArray?: SolarArray,
}

/**
 * Solar array controller.
 */
export class SolarArrayController {
  /**
   * Create a new solar array.
   *
   * @param {number} maxW Maximum solar power.
   */
  static async newSolarArray(maxW: number): Promise<SolarArray | undefined> {
    const id = await SOLAR_ARRAY_DB.create();
    await SOLAR_ARRAY_DB.update(id, {id: id, maxW: maxW});
    await EventLogDB.log(`CREATED new solar array with ID ${id} and max power ${maxW} W`);
    return await SOLAR_ARRAY_DB.read(id);
  }

  /**
   * Get solar array info.
   *
   * @param {string} id
   */
  static async getSolarArray(id: string): Promise<SolarArray | undefined> {
    return await SOLAR_ARRAY_DB.read(id);
  }

  /**
   * Set active solar power.
   *
   * @param {string} id
   * @param {number} activeW
   */
  static async setActiveSolarPower(
    id: string,
    activeW: number,
  ): Promise<SetActiveSolarPowerResult> {
    const solarArray = await SOLAR_ARRAY_DB.read(id);
    if (!solarArray) {
      throw new Error("Solar array does not exist");
    }
    const maxW = (!solarArray?.maxW) ? 0 : solarArray.maxW;
    const newPower = Math.min(maxW, Math.max(0, activeW));
    await EventLogDB.log(`SET solar array ${id}, power ${newPower} W`);
    await SOLAR_ARRAY_DB.update(id, {activeW: newPower});
    return <SetActiveSolarPowerResult>{
      activeW: newPower,
      solarArray: await SOLAR_ARRAY_DB.read(id),
    };
  }
}
