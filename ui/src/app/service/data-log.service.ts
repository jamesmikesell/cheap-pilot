import { Injectable } from '@angular/core';
import { Subject, timer } from 'rxjs';
import { LocationLogData } from '../component/config-page/config-page.component';
import { DownloadService } from '../download.service';

@Injectable({
  providedIn: 'root'
})
export class DataLogService {

  updated = new Subject<void>();
  get logData(): LogData[] { return this._logData; }


  private lastControllerOrientation: ControllerOrientationLogData;
  private lastControllerRotationRate: ControllerRotationRateLogData;
  private lastLocation: LocationLogData;
  private _logData: LogData[] = [];


  constructor(
    private downloadService: DownloadService,
  ) {
    timer(0, 100)
      .subscribe(() => {
        this.update();
      })
  }


  clearLogData(): void {
    this._logData = [];
  }

  async downloadLog(): Promise<void> {
    this.downloadService.download(JSON.stringify(this._logData), `log-${(Date.now())}.txt`);
  }


  logLocation(data: LocationLogData) {
    this.lastLocation = data;
  }


  logControllerOrientation(data: ControllerOrientationLogData) {
    this.lastControllerOrientation = data;
  }

  logControllerRotationRate(data: ControllerRotationRateLogData) {
    this.lastControllerRotationRate = data;
  }

  private update(): void {
    this._logData.push({
      time: new Date(),
      locationLat: this.lastLocation?.locationLat,
      locationLon: this.lastLocation?.locationLon,
      locationSpeedKt: this.lastLocation?.locationSpeedKt,
      locationGpsHeading: this.lastLocation?.locationGpsHeading,

      headingDesired: this.lastControllerOrientation?.headingDesired,
      headingRaw: this.lastControllerOrientation?.headingRaw,
      headingErrorRaw: this.lastControllerOrientation?.headingErrorRaw,
      headingErrorFiltered: this.lastControllerOrientation?.headingErrorFiltered,
      headingCommand: this.lastControllerOrientation?.headingCommand,
      headingPidEnabled: this.lastControllerOrientation?.headingPidEnabled,

      rotationRateDesired: this.lastControllerRotationRate?.rotationRateDesired,
      rotationRateCurrent: this.lastControllerRotationRate?.rotationRateCurrent,
      rotationRateReal: this.lastControllerRotationRate?.rotationRateReal,
      rotationRateCommand: this.lastControllerRotationRate?.rotationRateCommand,
    });

    this._logData = this._logData.filter(single => Date.now() - single.time.getTime() < 5 * 60 * 1000)

    this.updated.next();
  }

}



interface LogData {
  time: Date,
  locationLat: number,
  locationLon: number,
  locationSpeedKt: number,
  locationGpsHeading: number,

  headingDesired: number,
  headingRaw: number,
  headingErrorRaw: number,
  headingErrorFiltered: number,
  headingCommand: number,
  headingPidEnabled: boolean,

  rotationRateDesired: number,
  rotationRateCurrent: number,
  rotationRateReal: number,
  rotationRateCommand: number,
}


export class ControllerOrientationLogData {
  constructor(
    public headingDesired: number,
    public headingRaw: number,
    public headingErrorRaw: number,
    public headingErrorFiltered: number,
    public headingCommand: number,
    public headingPidEnabled: boolean,
  ) { }
}

export class ControllerRotationRateLogData {
  constructor(
    public rotationRateDesired: number,
    public rotationRateCurrent: number,
    public rotationRateReal: number,
    public rotationRateCommand: number,
  ) { }
}