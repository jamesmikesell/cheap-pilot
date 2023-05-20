import { Injectable } from '@angular/core';
import { BtMotorControllerService } from './bt-motor-controller.service';
import { SensorOrientationService } from './sensor-orientation.service';
import { PidController } from './pid-controller';
import { LowPassFilter } from './low-pass-filter';
import { HeadingStats } from './heading-stats';
import { DataLogService } from './data-log.service';
import { PidTuneService, Sensor } from './pid-tune.service';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerOrientationService {

  get kP(): number { return this.pidController.kP; }
  set kP(val: number) {
    this.pidController.kP = val;
    this.updateLocalStorage();
  }
  get kI(): number { return this.pidController.kI; }
  set kI(val: number) {
    this.pidController.kI = val;
    this.updateLocalStorage();
  }
  get kD(): number { return this.pidController.kD; }
  set kD(val: number) {
    this.pidController.kD = val;
    this.updateLocalStorage();
  }
  get enabled(): boolean { return this._enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      setTimeout(() => {
        this.motorService.command(0);
      }, 100);
    }
  }

  get currentMotorPower(): number { return this._motorPower; }



  private pidController: PidController;
  private filterError = this.getFilter();
  private headingHistory: number[] = [];
  private _enabled = false;
  private _motorPower = 0;
  private lastErrorFiltered: number;
  private tuner: PidTuneService;




  // private sensorOrientation: MockBoatSensorAndTillerController,
  // private motorService: MockBoatSensorAndTillerController,
  constructor(
    private sensorOrientation: SensorOrientationService,
    private motorService: BtMotorControllerService,
    private dataLog: DataLogService,
  ) {
    let pidStringP = localStorage.getItem(LocalStorageKeys.pidP);
    let pidStringI = localStorage.getItem(LocalStorageKeys.pidI);
    let pidStringD = localStorage.getItem(LocalStorageKeys.pidD);

    let kP = 0;
    let kI = 0;
    let kD = 0;

    if (pidStringP != null)
      kP = +pidStringP;
    if (pidStringI != null)
      kI = +pidStringI;
    if (pidStringD != null)
      kD = +pidStringD;

    this.pidController = new PidController(kP, kI, kD);


    this.sensorOrientation.update.subscribe(() => this.updateReceived())
  }


  maintainCurrentHeading() {
    this.setDesiredHeadingToCurrent();
    this.enabled = true;
  }

  private setDesiredHeadingToCurrent(): void {
    this.filterError = this.getFilter();
    this.sensorOrientation.desired = this.getAverageHeading();
    this.pidController.reset();
  }



  private updateReceived(): void {
    this.updateAverageHeading(this.sensorOrientation.current);
    const errorRaw = this.sensorOrientation.getError();
    const errorFiltered = this.filterError.process(errorRaw)
    this.lastErrorFiltered = errorFiltered;

    let command = this.pidController.update(errorFiltered);
    this.pidController.saturationReached = Math.abs(command) > 1;
    command = Math.max(command, -1)
    command = Math.min(command, 1)
    this._motorPower = command

    const useAutoPilot = this.motorService.connected.value && this.enabled;
    if (useAutoPilot)
      this.motorService.command(command);


    let logData = new ControllerOrientationLogData(
      this.sensorOrientation.desired,
      this.sensorOrientation.current,
      errorRaw,
      errorFiltered,
      command,
      useAutoPilot,
      this.getAverageHeading(),
    )

    this.dataLog.logControllerOrientation(logData);
  }


  private updateLocalStorage(): void {
    localStorage.setItem(LocalStorageKeys.pidP, this.pidController.kP.toString());
    localStorage.setItem(LocalStorageKeys.pidI, this.pidController.kI.toString());
    localStorage.setItem(LocalStorageKeys.pidD, this.pidController.kD.toString());
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


  private getFilter(): LowPassFilter {
    return new LowPassFilter(1 / 4);
  }

  stopPidTune() {
    this.tuner?.cancel();
  }


  async autoTune(): Promise<void> {
    this.tuner = new PidTuneService();
    let parent = this;
    this.setDesiredHeadingToCurrent();

    let sensor: Sensor = {
      getValue: function (): number {
        return parent.lastErrorFiltered
      }
    };

    let step = .1;
    let results = await this.tuner.tune(this.motorService, 0, step, -step, sensor, 100);
    alert(`kp: ${results.pid.kP}  ki: ${results.pid.kI}  kd: ${results.pid.kD}`)

  }


}



enum LocalStorageKeys {
  pidP = "pidP",
  pidI = "pidI",
  pidD = "pidD",
}


export class ControllerOrientationLogData {
  constructor(
    public desiredHeading: number,
    public headingRaw: number,
    public errorRaw: number,
    public errorFiltered: number,
    public command: number,
    public autoPilotOn: boolean,
    public headingAvg: number,
  ) { }
}