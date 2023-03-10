import * as firestore from "firebase-admin/firestore";
import {v4 as uuidv4} from "uuid";

import {EventLogDB} from "./data/EventLogDB";
import {EnergyConsumer, EnergyConsumerDB} from "./data/EnergyConsumerDB";

interface SetActivePowerConsumptionResult {
  activeW?: number,
  energyConsumer?: EnergyConsumer,
}

interface TakePowerResult {
  powerToken?: string,
  expireTimeUtcSeconds?: number,
  energyWh?: number,
  powerDurationHours?: number,
  activeW?: number,
  note?: string,
  solarArray?: EnergyConsumer,
}

/**
 * Solar array controller.
 */
export class EnergyConsumerController {
  /**
   * Create a new energy consumer.
   *
   * @param {number} maxW Maximum energy consumer power.
   */
  static async newEnergyConsumer(maxW: number): Promise<EnergyConsumer | undefined> {
    const id = await EnergyConsumerDB.create();
    await EnergyConsumerDB.update(id, {id: id, maxW: maxW});
    await EventLogDB.log(`CREATED new energy consumer with ID ${id} and max power ${maxW} W`);
    return await EnergyConsumerDB.get(id);
  }

  /**
   * Get energy consumer info.
   *
   * @param {string} id
   */
  static async getEnergyConsumer(id: string): Promise<EnergyConsumer | undefined> {
    return await EnergyConsumerDB.get(id);
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
    const energyConsumer = await EnergyConsumerDB.get(id);
    if (!energyConsumer) {
      throw new Error("Energy consumer does not exist");
    }
    const maxW = (!energyConsumer?.maxW) ? 0 : energyConsumer.maxW;
    const newPower = Math.min(maxW, Math.max(0, activeW));
    await EventLogDB.log(`SET energy consumer ${id}, power ${newPower} W`);
    await EnergyConsumerDB.update(id, {activeW: newPower});
    return <SetActivePowerConsumptionResult>{
      activeW: newPower,
      energyConsumer: await EnergyConsumerDB.get(id),
    };
  }

  /**
   * Attempt to take energy.
   *
   * Energy is delivered over time (multiple requests). The first request will always return 0 Wh.
   * Each response will contain a power token. Each token cannot be used more than once.
   * The token will have an expiration time. After the expiration, no energy can be withdrawn.
   * If a token is used before the expiration time, energy will be withdrawn.
   *
   * Energy (Wh) = Power (W) * Time Since Token Creation (h)
   *
   * takePower(no token)
   * -> Wh: 0, Token: A, Expires: 10 minutes
   * takePower(A)
   * -> Wh: 14, Token: B, Expires: 10 minutes
   * takePower(B)
   * -> Wh: 18, Token: C, Expires: 10 minutes
   * [Wait past expiration]
   * takePower(C)
   * -> Wh: 0, Token: D, Expires: 10 minutes
   *
   * @param {string} id Energy consumer ID.
   * @param {number} maxWh Maximum energy to take.
   * @param {string} powerToken Power token.
   */
  static async takePower(id: string, maxWh: number, powerToken: string): Promise<TakePowerResult> {
    // Calculate new values.
    const newPowerToken = uuidv4();
    const now = firestore.Timestamp.now();
    const connectionTimeSeconds = now.seconds;
    const expireDurationSeconds = 10 * 60; // 10 miutes.
    const newExpireTimeSeconds = connectionTimeSeconds + expireDurationSeconds;
    // Calculate potential energy delivered.
    const energyConsumer = await EnergyConsumerDB.get(id);
    if (!energyConsumer) {
      throw new Error("Energy consumer does not exist");
    }
    const activeW = (!energyConsumer?.activeW) ? 0 : energyConsumer.activeW;
    let note = "";
    let powerDurationHours = 0.0;
    let energyWh = 0.0;
    if (energyConsumer?.connectionTimeSeconds) {
      const oldConnectionTimeSeconds = energyConsumer.connectionTimeSeconds;
      powerDurationHours = (connectionTimeSeconds - oldConnectionTimeSeconds) / (60.0 * 60.0);
      energyWh = activeW * powerDurationHours;
    }
    // Constrain energy delivered.
    const providedToken = powerToken;
    const oldToken = energyConsumer?.powerToken;
    if (!oldToken) {
      energyWh = 0; // No old token.
      note = "Turning on solar array (array was not online)";
    } else if (!providedToken) {
      energyWh = 0; // No token provided.
      note = "New solar array connection (no token)";
    } else if (providedToken != oldToken) {
      energyWh = 0; // Mismatched token.
      note = "Bad solar array connection (wrong token)";
    } else if (!energyConsumer?.expireTimeUtcSeconds) {
      energyWh = 0; // No expire time found.
      note = "Cannot deliver power without known expiration time.";
    } else if (connectionTimeSeconds > energyConsumer.expireTimeUtcSeconds) {
      energyWh = 0; // Expired.
      note = "Disconnected. Connection expired.";
    }
    energyWh = Math.min(energyWh, maxWh); // Constrain maximum energy.
    await EventLogDB.log(`TAKE power for energy consumer ${id}, energy ${energyWh} Wh, ` +
      `power ${activeW} W, duration ${powerDurationHours} h, ` +
      `provided token ${providedToken}, old token ${oldToken}, new token ${newPowerToken}, ` +
      `connection time ${connectionTimeSeconds} s, expire time ${newExpireTimeSeconds} s`);
    await EnergyConsumerDB.update(id, {
      powerToken: newPowerToken,
      connectionTimeSeconds: connectionTimeSeconds,
      expireTimeUtcSeconds: newExpireTimeSeconds,
    });
    return <TakePowerResult>{
      powerToken: newPowerToken,
      expireTimeUtcSeconds: newExpireTimeSeconds,
      energyWh: energyWh,
      powerDurationHours: powerDurationHours,
      activeW: activeW,
      note: note,
      solarArray: await EnergyConsumerDB.get(id),
    };
  }
}
