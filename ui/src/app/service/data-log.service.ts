import { Injectable } from '@angular/core';
import { ControllerOrientationLogData } from './controller-orientation.service';
import { Subject } from 'rxjs';
import { LocationLogData } from '../component/test/test.component';
import * as localforage from 'localforage';
import { DownloadService } from '../download.service';

@Injectable({
  providedIn: 'root'
})
export class DataLogService {

  updated = new Subject<void>();
  autoSaveEnabled = false;
  get logData(): LogData[] { return this._logData; }


  private lastControllerOrientation: ControllerOrientationLogData;
  private lastLocation: LocationLogData;
  private _logData: LogData[] = [];


  constructor(
    private downloadService: DownloadService,
  ) {
    this.saveLogRecursive();
  }



  private saveLogRecursive(): void {
    setTimeout(async () => {
      this.trySaveLogData();
      this.saveLogRecursive();
    }, 5000);
  }


  async clearSavedData(): Promise<void> {
    await localforage.setItem("log", []);
  }

  clearUnsavedData(): void {
    this._logData = [];
  }

  async trySaveLogData(): Promise<void> {
    if (this.autoSaveEnabled)
      this.forceSaveLogData();
  }

  async forceSaveLogData(): Promise<void> {
    let existing: LogData[] = await localforage.getItem("asdf") || [];
    existing.push(...this._logData);
    await localforage.setItem("log", existing);
  }

  async downloadLog(): Promise<void> {
    await this.forceSaveLogData();
    let log = await localforage.getItem("log")
    this.downloadService.download(JSON.stringify(log), `log-${(Date.now())}.txt`);
  }



  logLocation(data: LocationLogData) {
    this.lastLocation = data;
    this.update();
  }


  logControllerOrientation(data: ControllerOrientationLogData) {
    this.lastControllerOrientation = data;
    this.update();
  }

  private update(): void {
    this._logData.push(new LogData(
      new Date(),
      this.lastLocation?.lat,
      this.lastLocation?.lon,
      this.lastControllerOrientation?.desiredHeading,
      this.lastControllerOrientation?.headingRaw,
      this.lastControllerOrientation?.errorRaw,
      this.lastControllerOrientation?.errorFiltered,
      this.lastControllerOrientation?.command,
      this.lastControllerOrientation?.autoPilotOn,
      this.lastLocation?.speedKt,
      this.lastControllerOrientation?.headingAvg,
      this.lastLocation?.distance,
    ));



    this.updated.next();
  }

}



class LogData {
  constructor(
    public time: Date,
    public lat: number,
    public lon: number,
    public desiredHeading: number,
    public headingRaw: number,
    public errorRaw: number,
    public errorFiltered: number,
    public command: number,
    public autoPilotOn: boolean,
    public speedKt: number,
    public headingAvg: number,
    public distance: number,
  ) { }
}
