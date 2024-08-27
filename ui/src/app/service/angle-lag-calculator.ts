import { CoordinateUtils } from "../utils/coordinate-utils";

export class AngleLagCalculator {
  private aSlope: number[] = [];
  private bSlope: number[] = [];
  private aAngleDegrees: number[] = [];
  private bAngleDegrees: number[] = [];


  constructor(
    private maxLag: number,
    private maxRecordsToRetain: number) { }


  add(aAngleDegrees: number, bAngleDegrees: number) {
    this.aSlope.push(Math.sin(CoordinateUtils.toRadians(aAngleDegrees)));
    this.bSlope.push(Math.sin(CoordinateUtils.toRadians(bAngleDegrees)));
    this.aAngleDegrees.push(aAngleDegrees)
    this.bAngleDegrees.push(bAngleDegrees)

    this.aSlope.slice(-this.maxRecordsToRetain)
    this.bSlope.slice(-this.maxRecordsToRetain)
    this.aAngleDegrees.slice(-this.maxRecordsToRetain)
    this.bAngleDegrees.slice(-this.maxRecordsToRetain)
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

    const maxLag = Math.min(signal1.length, signal2.length, this.maxLag);
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