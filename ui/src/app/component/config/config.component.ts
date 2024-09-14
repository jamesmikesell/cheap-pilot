import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService, ControllerConfig, RemoteReceiverMode, RotationControllerConfig } from 'src/app/service/config.service';
import { Controller } from 'src/app/service/controller';
import { ConnectableDevice } from 'src/app/service/controller-bt-motor.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerPathService } from 'src/app/service/controller-path.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { DataLogService } from 'src/app/service/data-log.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { TuningResult } from 'src/app/service/pid-tuner';
import { UnitConverter } from 'src/app/utils/unit-converter';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {

  btConnected = false;
  selectedRotationConfig: RotationControllerConfig[];
  selectedOrientationConfig: ControllerConfig[];
  RemoteReceiverMode = RemoteReceiverMode;
  motorSliderPower = 0;

  private motorControllerService: Controller<number> & ConnectableDevice;


  constructor(
    public configService: ConfigService,
    private dataLog: DataLogService,
    private controllerRotationRate: ControllerRotationRateService,
    private controllerOrientation: ControllerOrientationService,
    private controllerPath: ControllerPathService,
    private snackBar: MatSnackBar,
    deviceSelectService: DeviceSelectService,
  ) {
    this.motorControllerService = deviceSelectService.motorController;
  }


  ngOnInit(): void {
    this.motorControllerService.connected.subscribe(isConnected => this.btConnected = isConnected);
  }


  clearGraphs(): void {
    this.dataLog.clearLogData();
  }


  downloadLog(): void {
    this.dataLog.downloadLog();
  }


  remoteModeChange(mode: RemoteReceiverMode) {
    if (this.configService.config.remoteReceiverMode === mode)
      this.configService.config.remoteReceiverMode = undefined;
    else
      this.configService.config.remoteReceiverMode = mode

    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE)
      this.motorControllerService.disconnect()
  }


  loadSelectedRotation(): void {
    let selected = this.selectedRotationConfig[0];
    this.configService.config.rotationKp = selected.kP;
    this.configService.config.rotationKi = selected.kI;
    this.configService.config.rotationKd = selected.kD;
    this.configService.config.rotationPidDerivativeLowPassFrequency = selected.derivativeLowPassFrequency;
    this.configService.config.rotationLowPassFrequency = selected.lowPassFrequency;
    this.configService.config.rotationTuneSpeedKts = UnitConverter.mpsToKts(selected.rotationTuneSpeedMps);

    this.selectedRotationConfig = undefined;
  }


  deleteSelectedRotation() {
    let selected = new Set(this.selectedRotationConfig);
    this.configService.config.rotationConfigs = this.configService.config.rotationConfigs
      .filter(single => !selected.has(single));

    this.selectedRotationConfig = undefined;
  }


  addCurrentRotation(): void {
    let title = prompt("Enter name for config");
    if (title)
      this.configService.addCurrentRotationToConfigs(title);
  }


  loadSelectedOrientation(): void {
    let selected = this.selectedOrientationConfig[0];
    this.configService.config.orientationKp = selected.kP;
    this.configService.config.orientationKi = selected.kI;
    this.configService.config.orientationKd = selected.kD;
    this.configService.config.orientationPidDerivativeLowPassFrequency = selected.derivativeLowPassFrequency;
    this.configService.config.orientationLowPassFrequency = selected.lowPassFrequency;

    this.selectedOrientationConfig = undefined;
  }


  deleteSelectedOrientation() {
    let selected = new Set(this.selectedOrientationConfig);
    this.configService.config.orientationConfigs = this.configService.config.orientationConfigs
      .filter(single => !selected.has(single));

    this.selectedOrientationConfig = undefined;
  }


  addCurrentOrientation(): void {
    let title = prompt("Enter name for config");
    if (title)
      this.configService.addCurrentOrientationToConfigs(title);
  }


  async tuneRotationOnly(): Promise<TuningResult> {
    setTimeout(() => {
      this.dataLog.clearLogData();
    }, 500);

    this.disableAllControllers();
    let tuneResult = await this.controllerRotationRate.startPidTune();
    if (tuneResult.success)
      this.snackBar.open("Rot. Rt. PID Tune Complete", "Dismiss");
    else
      this.snackBar.open(`Rot. Rt. PID Tune Failed: ${tuneResult.description}`, "Dismiss")

    return tuneResult;
  }


  async tuneOrientationOnly(): Promise<TuningResult> {
    setTimeout(() => {
      this.dataLog.clearLogData();
    }, 500);

    this.disableAllControllers();
    let tuneResult = await this.controllerOrientation.startPidTune();
    if (tuneResult.success)
      this.snackBar.open("Orientation PID Tune Complete", "Dismiss")
    else
      this.snackBar.open(`Orientation PID Tune Failed: ${tuneResult.description}`, "Dismiss")

    return tuneResult;
  }


  private disableAllControllers(): void {
    if (this.controllerPath.enabled)
      this.controllerPath.enabled = false;
    if (this.controllerOrientation.enabled)
      this.controllerOrientation.enabled = false;
    if (this.controllerRotationRate.enabled)
      this.controllerRotationRate.enabled = false;
  }


  sliderDragEnd(): void {
    setTimeout(() => {
      this.motorSliderPower = 0;
      this.sliderMoved();
    }, 0);
  }

  sliderMoved(): void {
    this.disableAllControllers();
    this.motorControllerService.command(this.motorSliderPower / 100);
  }

  sliderFormatLabel(value: number): string {
    return value.toFixed(1) + "%";
  }

}
