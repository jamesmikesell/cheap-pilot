import { Injectable } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { CoordinateUtils } from '../utils/coordinate-utils';
import { ConfigService, PidTuneSaver } from './config.service';
import { Controller } from './controller';
import { ControllerRotationRateService } from './controller-rotation-rate.service';
import { ControllerOrientationLogData, DataLogService } from './data-log.service';
import { DeviceSelectService } from './device-select.service';
import { Filter, LowPassFilter } from './filter';
import { PidConfig, PidController } from './pid-controller';
import { PidTuner, PidTuningSuggestedValues, TuneConfig, TuningResult } from './pid-tuner';
import { HeadingAndTime } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerOrientationService implements Controller<number> {

  get enabled(): boolean { return this._enabled && this.rotationRateController.enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    this.rotationRateController.enabled = val;
  }

  get desired(): number { return this._desired }


  private _desired = 0;
  private pidController: PidController;
  private errorFilter = this.getFilter();
  private currentHeading: number;
  private _enabled = false;
  private tuner: PidTuner;
  private pidTuneComplete = new Subject<TuningResult>();



  constructor(
    deviceSelectService: DeviceSelectService,
    private rotationRateController: ControllerRotationRateService,
    private configService: ConfigService,
    private dataLog: DataLogService,
  ) {
    this.configurePidController();

    let sensorOrientation = deviceSelectService.orientationSensor;
    sensorOrientation.heading.subscribe(heading => this.updateReceived(heading))
  }



  command(level: number): void {
    this._desired = CoordinateUtils.normalizeHeading(level);
  }


  stop(): void {
    this.enabled = false
  }


  private configurePidController(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;
    let config: PidConfig = {
      get kP(): number { return self.configService.config.orientationKp; },
      get kI(): number { return self.configService.config.orientationKi; },
      get kD(): number { return self.configService.config.orientationKd; },
    }

    this.pidController = new PidController(
      config,
      new LowPassFilter({ getNumber: () => this.configService.config.orientationPidDerivativeLowPassFrequency }),
    );
  }


  maintainCurrentHeading() {
    this.setDesiredHeadingToCurrent();
    this.enabled = true;
  }


  private setDesiredHeadingToCurrent(): void {
    this._desired = this.currentHeading;
  }


  private getError(currentHeading: number): number {
    let delta = currentHeading - this._desired;
    if (delta > 180)
      delta = delta - 360;
    if (delta < -180)
      delta = delta + 360;

    return -delta;
  }


  private updateReceived(heading: HeadingAndTime): void {
    if (!this._enabled && !this.tuner)
      this._desired = heading.heading; //this prevents a buildup of error if the controller isn't enabled

    this.currentHeading = heading.heading;
    let errorRaw = this.getError(heading.heading);

    const errorFiltered = this.errorFilter.process(errorRaw, heading.time)

    let command: number;
    if (this.tuner) {
      command = this.tuner.sensorValueUpdated(errorFiltered, heading.time);
    } else {
      command = this.pidController.update(errorFiltered, heading.time);

      const maxRate = this.rotationRateController.maxRotationRate;
      this.pidController.saturationReached = Math.abs(command) > maxRate;
      command = Math.max(command, -maxRate)
      command = Math.min(command, maxRate)

      if (this._enabled)
        this.rotationRateController.command(command);
    }


    let logData = new ControllerOrientationLogData(
      this._desired,
      heading.heading,
      errorRaw,
      errorFiltered,
      command,
      this.enabled,
    )

    this.dataLog.logControllerOrientation(logData);
  }


  private getFilter(): Filter {
    return new LowPassFilter({ getNumber: () => this.configService.config.orientationLowPassFrequency });
  }


  private finalizePidTune(): void {
    this.rotationRateController.command(0);
    this.tuner = undefined;
  }


  cancelPidTune(): void {
    if (!this.tuner)
      return;

    this.finalizePidTune();
    this.pidTuneComplete.next({
      success: false,
      description: "PID Tuning Canceled",
      suggestedValues: undefined,
    })
  }


  private pidTuneSuccess(suggestedPidValues: PidTuningSuggestedValues): void {
    let tuningMethod = suggestedPidValues.p;
    this.configService.config.orientationKp = +tuningMethod.kP.toPrecision(4);
    this.configService.config.orientationKi = +tuningMethod.kI.toPrecision(4);
    this.configService.config.orientationKd = +tuningMethod.kD.toPrecision(4);

    let configValues = PidTuneSaver.convert(suggestedPidValues,
      this.configService.config.orientationLowPassFrequency,
      this.configService.config.orientationPidDerivativeLowPassFrequency)

    let existing = this.configService.config.orientationConfigs || []
    this.configService.config.orientationConfigs = [...configValues, ...existing]

    this.maintainCurrentHeading();
  }


  async startPidTune(): Promise<TuningResult> {
    let tuneConfig = new TuneConfig();
    tuneConfig.setPoint = 0;
    tuneConfig.step = this.configService.config.orientationTuneStepDegreesPerSecond;
    tuneConfig.maxCycleCount = 20;
    tuneConfig.noiseBand = this.configService.config.orientationTuneNoiseBand;
    tuneConfig.allowedAmplitudeVariance = this.configService.config.orientationTuneAllowedVariance / 100;
    tuneConfig.disableNoiseBandAfterCycle = this.configService.config.orientationTuneDisableNoiseBandCycles;


    this.setDesiredHeadingToCurrent();
    this._enabled = false;
    this.rotationRateController.enabled = true;
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
