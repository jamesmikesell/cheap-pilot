import { Component, OnInit } from '@angular/core';
import { BtMotorControllerService } from 'src/app/service/bt-motor-controller.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { DataLogService } from 'src/app/service/data-log.service';
import { SensorGpsService } from 'src/app/service/sensor-gps.service';
import { SensorOrientationService } from 'src/app/service/sensor-orientation.service';
import { WakeLockService } from 'src/app/service/wake-lock.service';
import { AppChartData } from '../chart/chart.component';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent implements OnInit {
  chartData1: AppChartData[] = [];
  chartData2: AppChartData[] = [];
  chartData3: AppChartData[] = [];
  chartData4: AppChartData[] = [];
  btConnected = false;
  clearDataString = "";
  loggingEnabled = false;
  showGraphs = false;


  constructor(
    private wakeLockService: WakeLockService,
    public controllerOrientation: ControllerOrientationService,
    public sensorGpsService: SensorGpsService,
    public sensorOrientation: SensorOrientationService, //SensorOrientationService
    private motorService: BtMotorControllerService, //BtMotorControllerService
    private dataLog: DataLogService,
  ) {
  }


  async clearData(): Promise<void> {
    if (this.canClear()) {
      await this.dataLog.clearSavedData();
      this.clearDataString = "";
    }
  }


  ngOnInit(): void {
    this.sensorGpsService.update.subscribe(() => this.updateReceived());

    this.motorService.connected.subscribe(isConnected => this.btConnected = isConnected);
    this.dataLog.updated.subscribe(() => this.updateCharts())
  }


  private updateReceived(): void {
    let logData = new LocationLogData(
      this.sensorGpsService.latitude,
      this.sensorGpsService.longitude,
      this.sensorGpsService.getSpeedKt(),
      0,
    )

    this.dataLog.logLocation(logData);
  }



  private updateCharts() {
    const start = this.dataLog.logData[0].time.getTime();
    let errorFiltered = new AppChartData("error filtered", []);
    let errorRaw = new AppChartData("error raw", []);
    let dataChart1: AppChartData[] = [errorRaw, errorFiltered];

    let headingRaw = new AppChartData("heading raw", []);
    let headingFiltered = new AppChartData("heading filtered", []);
    let dataChart2: AppChartData[] = [headingRaw, headingFiltered];

    let command = new AppChartData("command", []);
    let dataChart3: AppChartData[] = [errorFiltered, command];

    let distance = new AppChartData("distance", []);
    let dataChart4: AppChartData[] = [distance];

    const now = Date.now();
    this.dataLog.logData
      // .filter(single => now - single.time.getTime() < 10000)
      .forEach(singleLog => {
        const time = (singleLog.time.getTime() - start) / 1000;

        errorFiltered.data.push({ x: time, y: singleLog.errorFiltered })
        errorRaw.data.push({ x: time, y: singleLog.errorRaw })
        headingRaw.data.push({ x: time, y: singleLog.headingRaw })
        headingFiltered.data.push({ x: time, y: singleLog.headingAvg })
        command.data.push({ x: time, y: singleLog.command })
        distance.data.push({ x: time, y: singleLog.distance })
      })

    this.chartData1 = dataChart1;
    this.chartData2 = dataChart2;
    this.chartData3 = dataChart3;
    this.chartData4 = dataChart4;
  }

  async autoTune(): Promise<void> {
    await this.dataLog.trySaveLogData();
    this.dataLog.clearUnsavedData();

    this.controllerOrientation.autoTune();
  }

  async maintainCurrentHeading(): Promise<void> {
    await this.dataLog.trySaveLogData();
    this.dataLog.clearUnsavedData();

    this.controllerOrientation.maintainCurrentHeading();
  }

  downloadLog(): void {
    this.dataLog.downloadLog();
  }

  async initBluetooth(): Promise<void> {
    this.wakeLockService.wakeLock();

    this.motorService.connect();
  }

  changeAutoPilot(isOn: boolean): void {
    this.controllerOrientation.enabled = isOn;
  }

  moveManually(level: number): void {
    this.vibrate();
    this.motorService.command(level);
  }

  stopManually(): void {
    this.controllerOrientation.stopPidTune();

    if (this.controllerOrientation.enabled)
      this.changeAutoPilot(false);
    else
      this.motorService.command(0);

    this.vibrate();
  }

  private vibrate(): void {
    // let snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    // snd.play();
    navigator.vibrate([50]);
  }

  canClear(): boolean {
    return this.clearDataString.toLocaleLowerCase() === "clear";
  }

}


export class LocationLogData {
  constructor(
    public lat: number,
    public lon: number,
    public speedKt: number,
    public distance: number,
  ) { }
}