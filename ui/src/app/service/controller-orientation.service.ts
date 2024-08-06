import { Injectable } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { ConfigService } from './config.service';
import { ControllerRotationRateService } from './controller-rotation-rate.service';
import { ControllerOrientationLogData, DataLogService } from './data-log.service';
import { DeviceSelectService } from './device-select.service';
import { Filter, LowPassFilter } from './filter';
import { HeadingStats } from './heading-stats';
import { PidConfig, PidController } from './pid-controller';
import { PidTuner, PidTuningSuggestedValues, TuneConfig, TuningResult } from './pid-tuner';
import { HeadingAndTime, SensorOrientationService } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerOrientationService {

  get enabled(): boolean { return this._enabled && this.rotationRateController.enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    this.rotationRateController.enabled = val;
  }

  desired = 0;


  private pidController: PidController;
  private errorFilter = this.getFilter();
  private headingHistory: number[] = [];
  private _enabled = false;
  private tuner: PidTuner;
  private sensorOrientation: SensorOrientationService | MockBoatSensorAndTillerController;
  private pidTuneComplete = new Subject<TuningResult>();



  constructor(
    deviceSelectService: DeviceSelectService,
    private rotationRateController: ControllerRotationRateService,
    private configService: ConfigService,
    private dataLog: DataLogService,
  ) {
    this.sensorOrientation = deviceSelectService.orientationSensor;

    this.configurePidController();

    this.sensorOrientation.heading.subscribe(heading => this.updateReceived(heading))
  }


  private configurePidController(): void {
    let self = this;
    let config: PidConfig = {
      get kP(): number { return self.configService.config.orientationKp; },
      get kI(): number { return self.configService.config.orientationKi; },
      get kD(): number { return self.configService.config.orientationKd; },
    }

    this.pidController = new PidController(
      config,
      new LowPassFilter({ getCutoffFrequency: () => this.configService.config.orientationPidDerivativeLowPassFrequency }),
    );
  }

  maintainCurrentHeading() {
    this.setDesiredHeadingToCurrent();
    this.enabled = true;
  }

  private setDesiredHeadingToCurrent(): void {
    this.desired = this.getAverageHeading();
    this.errorFilter = this.getFilter();
    this.configurePidController();
  }


  private getError(currentHeading: number): number {
    let delta = currentHeading - this.desired;
    if (delta > 180)
      delta = delta - 360;
    if (delta < -180)
      delta = delta + 360;

    return -delta;
  }


  private updateReceived(heading: HeadingAndTime): void {
    this.updateAverageHeading(heading.heading);
    let errorRaw = this.getError(heading.heading);

    const errorFiltered = this.errorFilter.process(errorRaw, heading.time)

    this.processPidAutoTuneUpdate(errorFiltered, heading.time);

    let command = this.pidController.update(errorFiltered, heading.time);

    const maxRate = this.rotationRateController.maxRotationRate;
    this.pidController.saturationReached = Math.abs(command) > maxRate;
    command = Math.max(command, -maxRate)
    command = Math.min(command, maxRate)

    if (this._enabled)
      this.rotationRateController.desired = command;


    let logData = new ControllerOrientationLogData(
      this.desired,
      heading.heading,
      errorRaw,
      errorFiltered,
      command,
      this.enabled,
      this.getAverageHeading(),
    )

    this.dataLog.logControllerOrientation(logData);
  }


  getAverageHeading(): number {
    let avg = HeadingStats.circularMean(this.headingHistory);

    if (avg < 0)
      return 360 + avg;

    return avg;
  }


  private updateAverageHeading(currentHeading: number) {
    this.headingHistory.push(currentHeading);
    if (this.headingHistory.length > 6)
      this.headingHistory.shift()
  }


  private getFilter(): Filter {
    return new LowPassFilter({ getCutoffFrequency: () => this.configService.config.orientationLowPassFrequency });
  }


  private finalizePidTune(): void {
    this.rotationRateController.command(0);
    this.tuner = undefined;
  }


  cancelPidTune(): void {
    this.finalizePidTune();
    this.pidTuneComplete.next({
      success: false,
      description: "PID Tuning Canceled",
      suggestedValues: undefined,
    })
  }


  private processPidAutoTuneUpdate(headingError: number, time: number): void {
    this.tuner?.sensorValueUpdated(headingError, time);
  }


  private pidTuneSuccess(suggestedPidValues: PidTuningSuggestedValues): void {
    let tuningMethod = suggestedPidValues.pd;
    this.configService.config.orientationKp = +tuningMethod.kP.toPrecision(4);
    this.configService.config.orientationKi = +tuningMethod.kI.toPrecision(4);
    this.configService.config.orientationKd = +tuningMethod.kD.toPrecision(4);

    this.configurePidController();
  }


  async startPidTune(): Promise<TuningResult> {
    let tuneConfig = new TuneConfig();
    tuneConfig.setPoint = 0;
    tuneConfig.step = 1;
    tuneConfig.maxCycleCount = 20;
    tuneConfig.noiseBand = this.configService.config.orientationTuneNoiseBand;
    tuneConfig.allowedAmplitudeVariance = this.configService.config.orientationTuneAllowedVariance / 100;
    tuneConfig.disableNoiseBandAfterCycle = this.configService.config.orientationTuneDisableNoiseBandCycles;


    this.setDesiredHeadingToCurrent();
    this._enabled = false;
    this.tuner = new PidTuner(this.rotationRateController, tuneConfig);
    this.tuner.tuneComplete.subscribe(result => {
      this.finalizePidTune();
      if (result.success)
        this.pidTuneSuccess(result.suggestedValues);
      this.pidTuneComplete.next(result);
    })

    return await firstValueFrom(this.pidTuneComplete);
  }


}
