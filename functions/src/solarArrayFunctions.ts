import * as firestore from "firebase-admin/firestore";
import {v4 as uuidv4} from "uuid";

import {EventLog} from "./data/EventLog";
import {SolarArray} from "./data/SolarArray";

/**
 * Solar array controller.
 */
export class SolarArrayController {
  /**
   * Create a new solar array.
   *
   * @param {number} maxW Battery capacity.
   */
  static async newSolarArray(maxW: number): Promise<any> {
    const id = await SolarArray.create();
    await SolarArray.update(id, {id: id, maxW: maxW});
    await EventLog.log(`CREATED new solar array with ID ${id} and max power ${maxW} W`);
    return await SolarArray.get(id);
  }

  /**
   * Get solar array info.
   *
   * @param {string} id
   */
  static async getSolarArray(id: string): Promise<any> {
    return await SolarArray.get(id);
  }

  /**
   * Set active solar power.
   *
   * @param {string} id
   * @param {number} activeW
   */
  static async setActiveSolarPower(id: string, activeW: number): Promise<any> {
    const solarArray = await SolarArray.get(id as string);
    const newPower = Math.min(solarArray.maxW, Math.max(0, activeW));
    await EventLog.log(`SET solar array ${solarArray.id}, power ${newPower} W`);
    await SolarArray.update(solarArray.id, {activeW: newPower});
    return {
      activeW: newPower,
      solarArray: await SolarArray.get(solarArray.id),
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
  static async takeSolarPower(id: string, maxWh: number, solarToken: string): Promise<any> {
    // Calculate new values.
    const newSolarToken = uuidv4();
    const now = firestore.Timestamp.now();
    const connectionTimeSeconds = now.seconds;
    const expireDurationSeconds = 10 * 60;
    const newExpireTimeSeconds = connectionTimeSeconds + expireDurationSeconds;

    // Calculate potential energy delivered.
    const solarArray = await SolarArray.get(id);
    const powerDurationHours = (connectionTimeSeconds - solarArray.connectionTimeSeconds) / (60.0 * 60.0);
    const activeW = (!solarArray.activeW) ? 0 : solarArray.activeW;
    let energyWh = activeW * powerDurationHours;
    let note = "";

    // Constrain energy delivered.
    const providedToken = solarToken;
    const oldToken = solarArray.solarToken;
    if (connectionTimeSeconds > solarArray.expireTimeUtcSeconds) {
      energyWh = 0; // Expired.
      note = "Disconnected. Connection expired.";
    }
    if (!oldToken) {
      energyWh = 0; // No old token.
      note = "Turning on solar array (array was not online)";
    } else if (!providedToken) {
      energyWh = 0; // No token provided.
      note = "New solar array connection (no token)";
    } else if (providedToken != oldToken) {
      energyWh = 0; // Mismatched token.
      note = "Bad solar array connection (wrong token)";
    }
    energyWh = Math.min(energyWh, maxWh);

    await EventLog.log(`TAKE solar array ${solarArray.id}, energy ${energyWh} Wh, ` +
      `power ${activeW} W, duration ${powerDurationHours} h, ` +
      `provided token ${providedToken}, old token ${oldToken}, new token ${newSolarToken}, ` +
      `connection time ${connectionTimeSeconds} s, expire time ${newExpireTimeSeconds} s`);
    await SolarArray.update(solarArray.id, {
      solarToken: newSolarToken,
      connectionTimeSeconds: connectionTimeSeconds,
      expireTimeUtcSeconds: newExpireTimeSeconds,
    });
    return {
      solarToken: newSolarToken,
      expireTimeUtcSeconds: newExpireTimeSeconds,
      energyWh: energyWh,
      powerDurationHours: powerDurationHours,
      activeW: activeW,
      note: note,
      solarArray: await SolarArray.get(solarArray.id),
    };
  }
}
