import { Component, OnDestroy, OnInit } from '@angular/core';
import { filter, Subject, takeUntil, timer } from 'rxjs';
import { ConfigService, RemoteReceiverMode } from 'src/app/service/config.service';
import { Controller } from 'src/app/service/controller';
import { ConnectableDevice } from 'src/app/service/controller-bt-motor.service';
import { DataLogService } from 'src/app/service/data-log.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { NavBarService } from 'src/app/service/nav-bar.service';
import { GpsSensor, GpsSensorData } from 'src/app/service/sensor-gps.service';
import { OrientationSensor } from 'src/app/service/sensor-orientation.service';
import { UnitConverter } from 'src/app/utils/unit-converter';
import { AppChartData } from '../chart/chart.component';

@Component({
  selector: 'app-config-page',
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.scss']
})
export class ConfigPageComponent implements OnInit, OnDestroy {
  chartOrientation: AppChartData[] = [];
  chartDataRotationRate: AppChartData[] = [];
  chartNavigation: AppChartData[] = [];
  chartGpsHeading: AppChartData[] = [];
  btConnected = false;
  sensorOrientation: OrientationSensor;
  sensorLocation: GpsSensor;
  UnitConverter = UnitConverter;
  RemoteReceiverMode = RemoteReceiverMode;

  private motorControllerService: Controller<number> & ConnectableDevice;
  private destroy = new Subject<void>();


  constructor(
    deviceSelectService: DeviceSelectService,
    private dataLog: DataLogService,
    public configService: ConfigService,
    private navBarService: NavBarService,
  ) {
    this.motorControllerService = deviceSelectService.motorController;
    this.sensorOrientation = deviceSelectService.orientationSensor;
    this.sensorLocation = deviceSelectService.gpsSensor;
  }



  ngOnInit(): void {
    this.navBarService.showNavBar = false;

    this.sensorLocation.locationData
      .pipe(filter(locationData => !!locationData))
      .pipe(takeUntil(this.destroy))
      .subscribe(locationData => this.locationUpdated(locationData));

    this.motorControllerService.connected
      .pipe(takeUntil(this.destroy))
      .subscribe(isConnected => this.btConnected = isConnected);


    timer(0, 1 * 250)
      .pipe(takeUntil(this.destroy))
      .subscribe(() => {
        this.updateCharts()
      });
  }


  ngOnDestroy(): void {
    this.navBarService.showNavBar = true;
    this.destroy.next();
    this.destroy.complete();
  }


  clearGraphs(): void {
    this.dataLog.clearLogData();
    this.updateCharts();
  }


  private locationUpdated(locationData: GpsSensorData): void {
    let logData = new LocationLogData(
      locationData.coords.latitude,
      locationData.coords.longitude,
      UnitConverter.mpsToKts(locationData.speedMps),
      locationData.heading,
    )

    this.dataLog.logLocation(logData);
  }



  private updateCharts() {
    if (!this.dataLog.logData.length) {
      console.log("no log data");
      return;
    }

    const start = this.dataLog.logData[0].time.getTime();
    let headingErrorFiltered = new AppChartData("Deviation filtered °", []);
    let headingErrorRaw = new AppChartData("Deviation °", []);
    let headingCommand = new AppChartData("Command (°/s)", []);
    let chartOrientation: AppChartData[] = [headingErrorRaw, headingErrorFiltered, headingCommand];

    let rotationRateRaw = new AppChartData("Actual (°/s)", []);
    let rotationRateFiltered = new AppChartData("Set Point (°/s)", []);
    let rotationRateCommand = new AppChartData("Command (motor power level)", []);
    let rotationRateErrorFilter = new AppChartData("Simulation Rate w/o Noise (°/s)", []);
    let chartDataRotationRate: AppChartData[] = [rotationRateRaw, rotationRateFiltered, rotationRateCommand];
    if (this.configService.config.simulation)
      chartDataRotationRate.push(rotationRateErrorFilter);

    let distanceFromLine = new AppChartData("Dst Fr Ln", []);
    let chartNavigation: AppChartData[] = [distanceFromLine];

    let gpsHeading = new AppChartData("GPS Heading", []);
    let chartGpsHeading: AppChartData[] = [gpsHeading];

    this.dataLog.logData
      // .filter(single => now - single.time.getTime() < 10000)
      .forEach(singleLog => {
        const time = (singleLog.time.getTime() - start) / 1000;

        headingErrorFiltered.data.push({ x: time, y: singleLog.headingErrorFiltered })
        headingErrorRaw.data.push({ x: time, y: singleLog.headingErrorRaw })
        headingCommand.data.push({ x: time, y: singleLog.headingCommand })
        rotationRateRaw.data.push({ x: time, y: singleLog.rotationRateCurrent })
        rotationRateFiltered.data.push({ x: time, y: singleLog.rotationRateDesired })
        rotationRateCommand.data.push({ x: time, y: singleLog.rotationRateCommand })
        rotationRateErrorFilter.data.push({ x: time, y: singleLog.rotationRateReal })
        gpsHeading.data.push({ x: time, y: singleLog.locationGpsHeading })
      })

    this.chartOrientation = chartOrientation;
    this.chartDataRotationRate = chartDataRotationRate;
    this.chartNavigation = chartNavigation;
    this.chartGpsHeading = chartGpsHeading;
  }

}


export class LocationLogData {
  constructor(
    public locationLat: number,
    public locationLon: number,
    public locationSpeedKt: number,
    public locationGpsHeading: number,
  ) { }
}