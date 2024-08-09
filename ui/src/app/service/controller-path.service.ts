import { Injectable } from '@angular/core';
import { filter } from 'rxjs';
import { ControllerOrientationService } from './controller-orientation.service';
import { CoordinateUtils, LatLon } from './coordinate-utils';
import { DeviceSelectService } from './device-select.service';
import { Controller } from './controller';
import { OrientationSensor } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerPathService implements Controller<LatLon[]> {

  get desiredHeadingToDestination(): number { return this._desiredHeadingToDestination }

  get enabled(): boolean { return this._enabled }
  set enabled(val: boolean) {
    if (val)
      this.orientationController.enabled = true
    this._enabled = val;
  }


  _enabled = false;
  private _desiredHeadingToDestination: number;
  private path: LatLon[] = [];
  private orientationSensor: OrientationSensor;


  constructor(
    deviceSelectService: DeviceSelectService,
    private orientationController: ControllerOrientationService,
  ) {
    this.orientationSensor = deviceSelectService.orientationSensor;

    deviceSelectService.gpsSensor.locationData
      .pipe(filter(data => !!data && data.heading != undefined))
      .subscribe(locationData => {
        if (!this.enabled || !this.path || !this.path.length)
          return;

        let destination = this.path[0];
        let bearingToTarget = CoordinateUtils.calculateBearing(locationData.coords, destination)
        let distanceToTarget = CoordinateUtils.distanceBetweenPointsInMeters(destination, locationData.coords);

        this._desiredHeadingToDestination = bearingToTarget;

        if (distanceToTarget < 20)
          this.path.shift()

        let compassDrift = this.orientationSensor.heading.value.heading - locationData.heading;
        let correctedDestinationCompassHeading = CoordinateUtils.normalizeHeading(bearingToTarget + compassDrift)
        orientationController.command(correctedDestinationCompassHeading)
      })
  }


  command(path: LatLon[]): void {
    this.path = path;
  }


  stop(): void {
    this.path = undefined;
  }

}
