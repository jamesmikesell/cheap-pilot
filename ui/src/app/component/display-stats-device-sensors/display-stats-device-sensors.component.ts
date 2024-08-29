import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, timer, takeUntil, filter } from 'rxjs';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerPathService } from 'src/app/service/controller-path.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { GpsSensor, GpsSensorData } from 'src/app/service/sensor-gps.service';
import { OrientationSensor } from 'src/app/service/sensor-orientation.service';
import { UnitConverter } from 'src/app/utils/unit-converter';
import { DisplayStats } from '../display-stats/display-stats.component';

@Component({
  selector: 'app-display-stats-device-sensors',
  templateUrl: './display-stats-device-sensors.component.html',
  styleUrls: ['./display-stats-device-sensors.component.scss']
})
export class DisplayStatsDeviceSensorsComponent implements OnInit, OnDestroy {

  displayStatsConfig: DisplayStats;


  private destroy = new Subject<void>();
  private gpsHeading: number;
  private sensorOrientation: OrientationSensor;
  private sensorLocation: GpsSensor;
  private speedKts: number;


  constructor(
    private controllerOrientation: ControllerOrientationService,
    private controllerRotationRate: ControllerRotationRateService,
    private controllerPath: ControllerPathService,
    deviceSelectService: DeviceSelectService,
  ){
    this.sensorOrientation = deviceSelectService.orientationSensor;
    this.sensorLocation = deviceSelectService.gpsSensor;
  }


  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }


  ngOnInit(): void {
    timer(0, 1 * 250)
      .pipe(takeUntil(this.destroy))
      .subscribe(() => {
        this.updateDisplayStats();
      });

    this.sensorLocation.locationData
      .pipe(filter(locationData => !!locationData))
      .pipe(takeUntil(this.destroy))
      .subscribe(locationData => this.locationUpdated(locationData));
  }


  private locationUpdated(locationData: GpsSensorData): void {
    this.speedKts = UnitConverter.mpsToKts(locationData.speedMps);
    this.gpsHeading = locationData.heading;
  }


  private updateDisplayStats() {
    this.displayStatsConfig = {
      headingCurrentCompass: this.sensorOrientation.heading.value.heading,
      headingCurrentGps: this.gpsHeading,
      headingCurrentDrift: this.controllerPath.compassDriftDegrees,

      headingDesiredCompass: this.controllerOrientation.desired,
      headingDesiredGps: this.controllerPath.desiredHeadingToDestination,

      speedKts: this.speedKts,

      controllerRotationRate: this.controllerRotationRate.enabled,
      controllerOrientation: this.controllerOrientation.enabled,
      controllerPath: this.controllerPath.enabled,
    }
  }
}
