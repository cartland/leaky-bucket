import * as firestore from "firebase-admin/firestore";
import {v4 as uuidv4} from "uuid";

import {EventLogDB} from "./data/EventLogDB";
import {SolarArray, SolarArrayDB} from "./data/SolarArrayDB";

interface TakeSolarPowerResult {
  solarToken?: string,
  expireTimeUtcSeconds?: number,
  energyWh?: number,
  powerDurationHours?: number,
  activeW?: number,
  note?: string,
  solarArray?: SolarArray,
}

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
    const id = await SolarArrayDB.create();
    await SolarArrayDB.update(id, {id: id, maxW: maxW});
    await EventLogDB.log(`CREATED new solar array with ID ${id} and max power ${maxW} W`);
    return await SolarArrayDB.get(id);
  }

  /**
   * Get solar array info.
   *
   * @param {string} id
   */
  static async getSolarArray(id: string): Promise<SolarArray | undefined> {
    return await SolarArrayDB.get(id);
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
    const solarArray = await SolarArrayDB.get(id);
    if (!solarArray) {
      throw new Error("Solar array does not exist");
    }
    const maxW = (!solarArray?.maxW) ? 0 : solarArray.maxW;
    const newPower = Math.min(maxW, Math.max(0, activeW));
    await EventLogDB.log(`SET solar array ${id}, power ${newPower} W`);
    await SolarArrayDB.update(id, {activeW: newPower});
    return <SetActiveSolarPowerResult>{
      activeW: newPower,
      solarArray: await SolarArrayDB.get(id),
    };
  }

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
   * -> Wh: 0, Token: A, Expires: 10 minutes
   * takeSolarPower(A)
   * -> Wh: 14, Token: B, Expires: 10 minutes
   * takeSolarPower(B)
   * -> Wh: 18, Token: C, Expires: 10 minutes
   * [Wait past expiration]
   * takeSolarPower(C)
   * -> Wh: 0, Token: D, Expires: 10 minutes
   *
   * @param {string} id Solar array ID.
   * @param {number} maxWh Maximum energy to take.
   * @param {string} solarToken Solar token.
   */
  static async takeSolarPower(
    id: string,
    maxWh: number,
    solarToken: string,
  ): Promise<TakeSolarPowerResult> {
    // Calculate new values.
    const newSolarToken = uuidv4();
    const now = firestore.Timestamp.now();
    const connectionTimeSeconds = now.seconds;
    const expireDurationSeconds = 10 * 60; // 10 miutes.
    const newExpireTimeSeconds = connectionTimeSeconds + expireDurationSeconds;
    // Calculate potential energy delivered.
    const solarArray = await SolarArrayDB.get(id);
    if (!solarArray) {
      throw new Error("Solar array does not exist");
    }
    const activeW = (!solarArray?.activeW) ? 0 : solarArray.activeW;
    let note = "";
    let powerDurationHours = 0.0;
    let energyWh = 0.0;
    if (solarArray?.connectionTimeSeconds) {
      const oldConnectionTimeSeconds = solarArray.connectionTimeSeconds;
      powerDurationHours = (connectionTimeSeconds - oldConnectionTimeSeconds) / (60.0 * 60.0);
      energyWh = activeW * powerDurationHours;
    }
    // Constrain energy delivered.
    const providedToken = solarToken;
    const oldToken = solarArray?.solarToken;
    if (!oldToken) {
      energyWh = 0; // No old token.
      note = "Turning on solar array (array was not online)";
    } else if (!providedToken) {
      energyWh = 0; // No token provided.
      note = "New solar array connection (no token)";
    } else if (providedToken != oldToken) {
      energyWh = 0; // Mismatched token.
      note = "Bad solar array connection (wrong token)";
    } else if (!solarArray?.expireTimeUtcSeconds) {
      energyWh = 0; // No expire time found.
      note = "Cannot deliver power without known expiration time.";
    } else if (connectionTimeSeconds > solarArray.expireTimeUtcSeconds) {
      energyWh = 0; // Expired.
      note = "Disconnected. Connection expired.";
    }
    energyWh = Math.min(energyWh, maxWh); // Constrain maximum energy.
    await EventLogDB.log(`TAKE solar array ${id}, energy ${energyWh} Wh, ` +
      `power ${activeW} W, duration ${powerDurationHours} h, ` +
      `provided token ${providedToken}, old token ${oldToken}, new token ${newSolarToken}, ` +
      `connection time ${connectionTimeSeconds} s, expire time ${newExpireTimeSeconds} s`);
    await SolarArrayDB.update(id, {
      solarToken: newSolarToken,
      connectionTimeSeconds: connectionTimeSeconds,
      expireTimeUtcSeconds: newExpireTimeSeconds,
    });
    return <TakeSolarPowerResult>{
      solarToken: newSolarToken,
      expireTimeUtcSeconds: newExpireTimeSeconds,
      energyWh: energyWh,
      powerDurationHours: powerDurationHours,
      activeW: activeW,
      note: note,
      solarArray: await SolarArrayDB.get(id),
    };
  }
}
