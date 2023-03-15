import {v4 as uuidv4} from "uuid";
import {EnergyTransfer, PowerTransferMetadata, TransferCapacity} from "../data/PowerConnection";

/**
 * Calculate power functions.
 */
export class PowerTransferController {
  /**
   * Calculate how much energy can be transfered.
   *
   * This method calculates the potential energy that can be transfered
   * and generates the metadata to track future transfers.
   * If the energy is moved, the metadata should also be recorded.
   *
   * @param {PowerTransferMetadata} powerTransferMetadata Metadata about the transfer.
   * @param {number} currentTimeUtcSeconds Current time.
   * @param {string} powerToken Token request.
   * @param {TransferCapacity} transferCapacity Power and energy restrictions.
   * @return {EnergyTransfer} Energy that can be transfered and new metadata.
   */
  static calculateEnergyTransfer(
    powerTransferMetadata: PowerTransferMetadata | undefined,
    currentTimeUtcSeconds: number,
    powerToken: string,
    transferCapacity: TransferCapacity,
  ): EnergyTransfer {
    // Calculate new values.
    const newPowerToken = uuidv4();
    const expireDurationSeconds = 10.0 * 60.0; // 10 miutes.
    const newExpireTimeSeconds = currentTimeUtcSeconds + expireDurationSeconds;
    // Calculate potential energy delivered.
    if (!(powerTransferMetadata &&
      powerTransferMetadata.powerToken &&
      powerTransferMetadata.connectionTimeUtcSeconds &&
      powerTransferMetadata.expireTimeUtcSeconds)) {
      // Initialize power connection.
      console.log("First usage");
      return <EnergyTransfer>{
        energyTransferWh: 0,
        transferDurationHours: 0,
        powerW: 0,
        metadata: <PowerTransferMetadata>{
          powerToken: newPowerToken,
          connectionTimeUtcSeconds: currentTimeUtcSeconds,
          expireTimeUtcSeconds: newExpireTimeSeconds,
        },
      };
    }
    if (powerToken != powerTransferMetadata.powerToken) {
      // Incorrect power token. Keep old connection information.
      console.log("Incorrect power token");
      return <EnergyTransfer>{
        energyTransferWh: 0,
        transferDurationHours: 0,
        powerW: 0,
        metadata: powerTransferMetadata,
      };
    }
    if (currentTimeUtcSeconds > powerTransferMetadata.expireTimeUtcSeconds) {
      // Token is expired. Create a new connection.
      console.log("Expired power token");
      return <EnergyTransfer>{
        energyTransferWh: 0,
        transferDurationHours: 0,
        powerW: 0,
        metadata: <PowerTransferMetadata>{
          powerToken: newPowerToken,
          connectionTimeUtcSeconds: currentTimeUtcSeconds,
          expireTimeUtcSeconds: newExpireTimeSeconds,
        },
      };
    }
    const oldConnectionTimeSeconds = powerTransferMetadata.connectionTimeUtcSeconds;
    const powerDurationHours = (currentTimeUtcSeconds - oldConnectionTimeSeconds) / (60.0 * 60.0);
    if (powerDurationHours <= 0) {
      console.log("No time has passed");
      // No time has passed. Keep old connection information.
      return <EnergyTransfer>{
        energyTransferWh: 0,
        transferDurationHours: 0,
        powerW: 0,
        metadata: powerTransferMetadata,
      };
    }
    const energyWh = Math.min(
      transferCapacity.powerW * powerDurationHours,
      transferCapacity.energyWh,
    );
    const actualPowerW = energyWh / powerDurationHours;
    return <EnergyTransfer>{
      energyTransferWh: energyWh,
      transferDurationHours: powerDurationHours,
      powerW: actualPowerW,
      metadata: <PowerTransferMetadata>{
        powerToken: newPowerToken,
        connectionTimeUtcSeconds: currentTimeUtcSeconds,
        expireTimeUtcSeconds: newExpireTimeSeconds,
      },
    };
  }
}
