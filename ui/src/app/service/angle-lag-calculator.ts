import { NumberProvider, ProviderConverter } from "../types/providers";
import { CoordinateUtils } from "../utils/coordinate-utils";

export class AngleLagCalculator {
  private aSlope: number[] = [];
  private bSlope: number[] = [];
  private aAngleDegrees: number[] = [];
  private bAngleDegrees: number[] = [];
  private maxLagRecords: NumberProvider;
  private maxRetentionRecords: NumberProvider;


  constructor(
    maxLagRecords: number | NumberProvider,
    maxRetentionRecords: number | NumberProvider) {

    this.maxLagRecords = ProviderConverter.ensureNumberProvider(maxLagRecords);
    this.maxRetentionRecords = ProviderConverter.ensureNumberProvider(maxRetentionRecords);
  }


  add(aAngleDegrees: number, bAngleDegrees: number) {
    this.aSlope.push(Math.sin(CoordinateUtils.toRadians(aAngleDegrees)));
    this.bSlope.push(Math.sin(CoordinateUtils.toRadians(bAngleDegrees)));
    this.aAngleDegrees.push(aAngleDegrees)
    this.bAngleDegrees.push(bAngleDegrees)

    this.aSlope.slice(-this.maxRetentionRecords.getNumber())
    this.bSlope.slice(-this.maxRetentionRecords.getNumber())
    this.aAngleDegrees.slice(-this.maxRetentionRecords.getNumber())
    this.bAngleDegrees.slice(-this.maxRetentionRecords.getNumber())
  }


  getLagAdjustedAvgDeltaDegrees(): number {
    let lag = this.calculateLagMse();
    let absLag = Math.abs(lag)
    let avgX = 0;
    let avgY = 0;
    for (let i = absLag; i < this.aAngleDegrees.length; i++) {
      let aLagsB = lag > 0;
      let aAngle = this.aAngleDegrees[aLagsB ? i : i - absLag]
      let bAngle = this.bAngleDegrees[aLagsB ? i - absLag : i]

      let delta = aAngle - bAngle;

      let x = Math.cos(CoordinateUtils.toRadians(delta));
      let y = Math.sin(CoordinateUtils.toRadians(delta));

      avgX += x / (this.aAngleDegrees.length - absLag)
      avgY += y / (this.aAngleDegrees.length - absLag)
    }

    return CoordinateUtils.toDegrees(Math.atan2(avgY, avgX));
  }


  private static calculateMse(signal1: number[], signal2: number[]): number {
    const length = Math.min(signal1.length, signal2.length);
    let mse = 0;

    for (let i = 0; i < length; i++) {
      const diff = signal1[i] - signal2[i];
      mse += diff * diff;
    }

    return mse / length;
  }


  calculateLagMse(): number {
    let signal1 = this.aSlope
    let signal2 = this.bSlope

    const maxLag = Math.min(signal1.length, signal2.length, this.maxLagRecords.getNumber());
    let minMSE = Infinity;
    let bestLag = 0;

    for (let lag = -maxLag + 1; lag < maxLag; lag++) {
      let shiftedSignal1, shiftedSignal2;

      if (lag > 0) {
        shiftedSignal1 = signal1.slice(lag);
        shiftedSignal2 = signal2.slice(0, signal2.length - lag);
      } else {
        shiftedSignal1 = signal1.slice(0, signal1.length + lag);
        shiftedSignal2 = signal2.slice(-lag);
      }

      const mse = AngleLagCalculator.calculateMse(shiftedSignal1, shiftedSignal2);

      if (mse < minMSE) {
        minMSE = mse;
        bestLag = lag;
      }
    }

    return bestLag;
  }

}
