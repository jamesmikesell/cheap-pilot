import { Subject, Subscription, firstValueFrom, takeUntil, timer } from 'rxjs';
import { Controller } from './controller';

export class PidTuneService {

  private loopSubscription: Subscription;
  private historyProcess: Point[] = []

  constructor() { }

  async tune(controller: Controller, setPoint: number, stepHigh: number, stepLow: number, sensor: Sensor, intervalMs = 100, cycleCount = 5): Promise<PidTuningSuggestedValues> {
    let end = new Subject<PidTuningSuggestedValues>();

    this.loopSubscription = timer(0, intervalMs)
      .pipe(takeUntil(end))
      .subscribe(() => {
        let sensorValue = sensor.getValue();
        let command = stepLow;
        if (sensorValue < setPoint)
          command = stepHigh;

        this.historyProcess.push(new Point(new Date(), sensorValue));

        let extremaProcess = this.findLocalExtrema(this.historyProcess);
        if (extremaProcess.length > cycleCount) {
          this.loopSubscription.unsubscribe();
          controller.stop();

          let suggestedPidValues = this.calculatePidConfigs(extremaProcess, stepHigh - stepLow);

          end.next(suggestedPidValues);
        } else {
          controller.command(command);
        }
      });

    return await firstValueFrom(end);
  }

  cancel(): void {
    if (this.loopSubscription && !this.loopSubscription.closed)
      this.loopSubscription.unsubscribe();
  }


  findLocalExtrema(points: Point[]): Point[] {
    const extrema: Point[] = [];

    let duplicateValueStartIndex: number = undefined;
    // Check for local minima/maxima at each point
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const current = points[i];
      const next = points[i + 1];

      if (duplicateValueStartIndex !== undefined) {
        let valBeforeDuplicates = points[duplicateValueStartIndex - 1];
        let midPoint = points[Math.round((i + duplicateValueStartIndex) / 2)]
        if (current.value < valBeforeDuplicates.value && current.value < next.value) {
          // Local minimum found
          extrema.push(midPoint);
          duplicateValueStartIndex = undefined;
        } else if (current.value > valBeforeDuplicates.value && current.value > next.value) {
          // Local maximum found
          extrema.push(midPoint);
          duplicateValueStartIndex = undefined;
        }
      }

      if (current.value < prev.value && current.value < next.value) {
        // Local minimum found
        extrema.push(current);
      } else if (current.value > prev.value && current.value > next.value) {
        // Local maximum found
        extrema.push(current);
      } else if (current.value === next.value && current.value !== prev.value && duplicateValueStartIndex === undefined) {
        duplicateValueStartIndex = i;
      }
    }

    return extrema;
  }


  private calculateKuAndTu(processExtrema: Point[], amplitudeControl: number, lookBackSamples: number): RelayTuningResults {
    // Ku = 4b/(PI())a
    // b = amplitude of the control output change 
    // a = amplitude of the process variable oscillation

    // Skipping the first 2 values as they likely have a lot of error
    let processExtremaShort = [...processExtrema].slice(processExtrema.length - lookBackSamples);
    let processTime = processExtremaShort[processExtremaShort.length - 1].time.getTime() - processExtremaShort[0].time.getTime();
    let periodAverage = (processTime / (processExtremaShort.length - 1)) * 2 / 1000;


    let amplitudeProcess = this.getAmplitude(processExtremaShort);

    let kU = (4 * amplitudeControl) / (Math.PI * amplitudeProcess);

    return new RelayTuningResults(periodAverage, kU);
  }

  private calculatePidConfigs(processExtrema: Point[], controlAmplitude: number, lookBackSamples = 3): PidTuningSuggestedValues {
    let tuningResults = this.calculateKuAndTu(processExtrema, controlAmplitude, lookBackSamples);

    let pid = new PidConfig();
    pid.kP = .6 * tuningResults.Ku;
    pid.kI = 1.2 * tuningResults.Ku / tuningResults.Tu;
    pid.kD = 3 * tuningResults.Ku * tuningResults.Tu / 40;

    let noOvershoot = new PidConfig();
    noOvershoot.kP = .2 * tuningResults.Ku;
    noOvershoot.kI = .4 * tuningResults.Ku / tuningResults.Tu;
    noOvershoot.kD = .066 * tuningResults.Ku * tuningResults.Tu / 40;


    let config = new PidTuningSuggestedValues();
    config.pid = pid;
    config.noOvershoot = noOvershoot;

    return config;
  }


  private getAmplitude(points: Point[]): number {
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    for (const singlePoint of points) {
      if (singlePoint.value < minValue)
        minValue = singlePoint.value;

      if (singlePoint.value > maxValue)
        maxValue = singlePoint.value;
    }

    return maxValue - minValue;
  }

}


export interface Sensor {
  getValue(): number;
}


export class Point {
  time: Date;
  value: number;

  constructor(time: Date, value: number) {
    this.time = time;
    this.value = value;
  }
}

export class PidConfig {
  kP: number;
  kI: number;
  kD: number;
}

export class RelayTuningResults {
  constructor(
    public Tu: number,
    public Ku: number,
  ) { }
}


export class PidTuningSuggestedValues {
  pid: PidConfig;
  noOvershoot: PidConfig;
}