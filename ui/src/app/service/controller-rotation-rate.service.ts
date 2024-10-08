import { Injectable } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { CoordinateUtils } from '../utils/coordinate-utils';
import { UnitConverter } from '../utils/unit-converter';
import { ConfigService, PidTuneSaver } from './config.service';
import { Controller } from './controller';
import { ControllerRotationRateLogData, DataLogService } from './data-log.service';
import { DeviceSelectService } from './device-select.service';
import { Filter, HeadingFilter, LowPassFilter } from './filter';
import { PidConfig, PidController } from './pid-controller';
import { PidTuner, PidTuningSuggestedValues, TuneConfig, TuningResult } from './pid-tuner';
import { GpsSensor } from './sensor-gps.service';
import { HeadingAndTime } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerRotationRateService implements Controller<number> {

  get enabled(): boolean { return this._enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      setTimeout(() => {
        this.motorService.command(0);
      }, 100);
    }
  }

  get maxRotationRate(): number {
    let speedKts = UnitConverter.mpsToKts(this.getCurrentSpeedMps());
    return this.configService.config.maxTurnRateDegreesPerSecondPerKt * speedKts
  }

  get desired(): number { return this._desired }


  private _desired = 0;
  private pidController: PidController;
  private filterHeading: Filter;
  private filterRotationRate: Filter;
  private _enabled = false;
  private tuner: PidTuner;
  private motorService: Controller<number>;
  private previousHeading: HeadingAndTime;
  private pidTuneComplete = new Subject<TuningResult>();
  private sensorLocation: GpsSensor;


  constructor(
    private deviceSelectService: DeviceSelectService,
    private dataLog: DataLogService,
    private configService: ConfigService,
  ) {
    this.motorService = deviceSelectService.motorController;
    this.sensorLocation = deviceSelectService.gpsSensor;
    this.filterRotationRate = new LowPassFilter({ getNumber: () => this.configService.config.rotationLowPassFrequency });
    this.filterHeading = new HeadingFilter({ getNumber: () => this.configService.config.rotationPreFilterHeadingLowPassFrequency })

    this.configurePidController();

    let sensorOrientation = deviceSelectService.orientationSensor;
    sensorOrientation.heading.subscribe(heading => this.updateReceived(heading));
  }


  private configurePidController(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;
    let config: PidConfig = {
      get kP(): number { return self.configService.config.rotationKp; },
      get kI(): number { return self.configService.config.rotationKi; },
      get kD(): number { return self.configService.config.rotationKd; },
    }

    this.pidController = new PidController(
      config,
      new LowPassFilter({ getNumber: () => this.configService.config.rotationPidDerivativeLowPassFrequency }),
    );
  }


  command(level: number): void {
    this._desired = level;
  }


  stop(): void {
    this.enabled = false;
    this.motorService.stop()
  }


  private getGetRotationAmount(currentAngle: number, previousAngle: number): number {
    let delta = currentAngle - previousAngle;
    delta = CoordinateUtils.normalizeHeading(delta);
    if (delta > 180)
      delta = delta - 360

    return -delta;
  }


  private updateReceived(headingRaw: HeadingAndTime): void {
    let filteredHeading = new HeadingAndTime(
      headingRaw.time,
      this.filterHeading.process(headingRaw.heading, headingRaw.time),
    )

    try {
      if (!this.previousHeading)
        return;

      // disabling speed compensation if we're truly stopped
      let speedMps = 1;
      if (this.getCurrentSpeedMps() > 0.01)
        speedMps = this.getCurrentSpeedMps();

      let timeDeltaSeconds = (filteredHeading.time - this.previousHeading.time) / 1000;
      let rawRotationRate = this.getGetRotationAmount(filteredHeading.heading, this.previousHeading.heading) / timeDeltaSeconds;

      let filteredRotationRate = this.filterRotationRate.process(rawRotationRate, filteredHeading.time);
      let command: number;
      if (this.enabled || this.tuner) {
        if (this.tuner) {
          command = this.tuner.sensorValueUpdated(filteredRotationRate, filteredHeading.time);
        } else {
          let maxRotationRate = UnitConverter.ktToMps(this.configService.config.maxTurnRateDegreesPerSecondPerKt) * speedMps;
          let limitedDesired = Math.min(this._desired, maxRotationRate);
          limitedDesired = Math.max(limitedDesired, -maxRotationRate);
          let error = filteredRotationRate - limitedDesired;

          command = this.pidController.update(error, filteredHeading.time);
          this.pidController.saturationReached = Math.abs(command) >= 1;
          command = Math.max(command, -1)
          command = Math.min(command, 1)

          if (this.enabled)
            this.motorService.command(command);
        }
      }

      let loggedSetPoint = this.enabled ? this._desired : 0;
      let logData = new ControllerRotationRateLogData(
        loggedSetPoint,
        filteredRotationRate,
        this.deviceSelectService.mockBoat.rotationRateReal(),
        command,
      )

      this.dataLog.logControllerRotationRate(logData);
    } finally {
      this.previousHeading = filteredHeading;
    }

  }


  private finalizePidTune(): void {
    this.motorService.command(0);
    this.tuner = undefined;
  }


  private getCurrentSpeedMps(): number {
    let currentData = this.sensorLocation.locationData.value;
    if (!currentData || !currentData.speedMps)
      return 0;

    return currentData.speedMps;
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
    this.configService.config.rotationKp = +tuningMethod.kP.toPrecision(4);
    this.configService.config.rotationKi = +tuningMethod.kI.toPrecision(4);
    this.configService.config.rotationKd = +tuningMethod.kD.toPrecision(4);

    let configValues = PidTuneSaver.convert(suggestedPidValues,
      this.configService.config.rotationLowPassFrequency,
      this.configService.config.rotationPidDerivativeLowPassFrequency)

    let existing = this.configService.config.rotationConfigs || []
    this.configService.config.rotationConfigs = [...configValues, ...existing]

    this.command(0);
  }


  async startPidTune(): Promise<TuningResult> {
    let tuneConfig = new TuneConfig();
    this._desired = 0;
    tuneConfig.setPoint = 0;
    tuneConfig.step = this.configService.config.rotationTuneStepPowerPercent / 100;
    tuneConfig.maxCycleCount = 20;
    tuneConfig.noiseBand = this.configService.config.rotationTuneNoiseBand;
    tuneConfig.allowedAmplitudeVariance = this.configService.config.rotationTuneAllowedVariance / 100;
    tuneConfig.disableNoiseBandAfterCycle = this.configService.config.rotationTuneDisableNoiseBandCycles;

    this._enabled = false;
    this.tuner = new PidTuner(this.motorService, tuneConfig);
    this.tuner.tuneComplete.subscribe(result => {
      this.finalizePidTune();
      if (result.success)
        this.pidTuneSuccess(result.suggestedValues);
      this.pidTuneComplete.next(result);
    })


    return await firstValueFrom(this.pidTuneComplete);
  }


}
