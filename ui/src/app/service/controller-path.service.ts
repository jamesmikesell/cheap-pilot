import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, interval, map } from 'rxjs';
import { CoordinateUtils, LatLon } from '../utils/coordinate-utils';
import { ConfigService } from './config.service';
import { Controller } from './controller';
import { ControllerOrientationService } from './controller-orientation.service';
import { AngleLagCalculator } from './angle-lag-calculator';
import { DeviceSelectService } from './device-select.service';
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
    else
      this._desiredHeadingToDestination = undefined;
    this._enabled = val;
  }
  compassDriftDegrees: number;
  pathSubscription = new BehaviorSubject<LatLon[]>(undefined);

  private _enabled = false;
  private _desiredHeadingToDestination: number;
  private path: LatLon[] = [];
  private orientationSensor: OrientationSensor;


  constructor(
    deviceSelectService: DeviceSelectService,
    private orientationController: ControllerOrientationService,
    private configService: ConfigService,
  ) {
    this.orientationSensor = deviceSelectService.orientationSensor;
    let driftCalculator = new AngleLagCalculator({ getNumber: () => this.configService.config.pathDriftLagMaxSeconds },
      { getNumber: () => this.configService.config.pathDriftAverageMinutes * 60 });

    interval(1000)
      .pipe(map(() => deviceSelectService.gpsSensor.locationData.value))
      .pipe(filter(data => !!data && data.heading != undefined))
      .subscribe(locationData => {
        // always calculate filtered drift, even if we're not navigating.
        let compass = this.orientationSensor.heading.value.heading
        let gps = locationData.heading
        driftCalculator.add(compass, gps)

        let filteredDrift = driftCalculator.getLagAdjustedAvgDeltaDegrees();
        this.compassDriftDegrees = filteredDrift

        if (this.enabled && this.path && this.path.length) {
          let destination = this.path[0];
          let bearingToTarget = CoordinateUtils.calculateBearing(locationData.coords, destination)
          let distanceToTarget = CoordinateUtils.distanceBetweenPointsInMeters(destination, locationData.coords);

          this._desiredHeadingToDestination = bearingToTarget;

          if (distanceToTarget < configService.config.waypointProximityMeters) {
            this.path.shift()
            if (this.path.length === 0)
              this.stop();
            else
              this.pathUpdated();
          }

          let correctedDestinationCompassHeading = CoordinateUtils.normalizeHeading(bearingToTarget + filteredDrift)
          orientationController.command(correctedDestinationCompassHeading)
        }
      })
  }



  command(path: LatLon[]): void {
    this.path = path;
    this.pathUpdated();
  }


  private pathUpdated(): void {
    if (this.path)
      this.pathSubscription.next(this.typeSafeClone(this.path));
    else
      this.pathSubscription.next(undefined);
  }


  private typeSafeClone<T>(object: T): T {
    return JSON.parse(JSON.stringify(object)) as T;
  }


  stop(): void {
    this.path = undefined;
    this.enabled = false;
    this.pathUpdated();
  }

}
