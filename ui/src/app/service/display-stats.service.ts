import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, timer } from 'rxjs';
import { DisplayStats } from '../component/display-stats/display-stats.component';
import { UnitConverter } from '../utils/unit-converter';
import { Controller } from './controller';
import { ConnectableDevice } from './controller-bt-motor.service';
import { ControllerOrientationService } from './controller-orientation.service';
import { ControllerPathService } from './controller-path.service';
import { ControllerRotationRateService } from './controller-rotation-rate.service';
import { DeviceSelectService } from './device-select.service';
import { GpsSensor, GpsSensorData } from './sensor-gps.service';
import { OrientationSensor } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class DisplayStatsService {

  displayStats = new BehaviorSubject<DisplayStats>({} as DisplayStats);


  private gpsHeading: number;
  private sensorOrientation: OrientationSensor;
  private sensorLocation: GpsSensor;
  private speedKts: number;
  private motorController: Controller<number> & ConnectableDevice;


  constructor(
    private controllerOrientation: ControllerOrientationService,
    private controllerRotationRate: ControllerRotationRateService,
    private controllerPath: ControllerPathService,
    deviceSelectService: DeviceSelectService,
  ) {
    this.sensorOrientation = deviceSelectService.orientationSensor;
    this.sensorLocation = deviceSelectService.gpsSensor;
    this.motorController = deviceSelectService.motorController;

    timer(0, 1 * 250)
      .subscribe(() => {
        this.updateDisplayStats();
      });

    this.sensorLocation.locationData
      .pipe(filter(locationData => !!locationData))
      .subscribe(locationData => this.locationUpdated(locationData));
  }


  private locationUpdated(locationData: GpsSensorData): void {
    this.speedKts = UnitConverter.mpsToKts(locationData.speedMps);
    this.gpsHeading = locationData.heading;
  }


  private updateDisplayStats() {
    this.displayStats.next({
      headingCurrentCompass: this.sensorOrientation.heading.value.heading,
      headingCurrentGps: this.gpsHeading,
      headingCurrentDrift: this.controllerPath.compassDriftDegrees,

      headingDesiredCompass: this.controllerOrientation.desired,
      headingDesiredGps: this.controllerPath.desiredHeadingToDestination,

      speedKts: this.speedKts,

      controllerRotationRate: this.controllerRotationRate.enabled,
      controllerOrientation: this.controllerOrientation.enabled,
      controllerPath: this.controllerPath.enabled,

      bluetoothConnected: this.motorController.connected.value,
    })
  }


}
