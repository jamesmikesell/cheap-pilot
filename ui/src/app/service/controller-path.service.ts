import { Injectable } from '@angular/core';
import { filter, Subject } from 'rxjs';
import { ConfigService } from './config.service';
import { Controller } from './controller';
import { ControllerOrientationService } from './controller-orientation.service';
import { CoordinateUtils, LatLon } from './coordinate-utils';
import { DeviceSelectService } from './device-select.service';
import { HeadingFilter } from './filter';
import { GpsSensorData } from './sensor-gps.service';
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
  pointReached = new Subject<void>();
  compassDriftDegrees: number;

  private _enabled = false;
  private _desiredHeadingToDestination: number;
  private path: LatLon[] = [];
  private orientationSensor: OrientationSensor;
  private lastUpdateTime: number;
  private totalDistanceTraveled = 0;
  private compassDriftFilter: HeadingFilter;


  constructor(
    deviceSelectService: DeviceSelectService,
    private orientationController: ControllerOrientationService,
    configService: ConfigService,
  ) {
    this.orientationSensor = deviceSelectService.orientationSensor;
    this.compassDriftFilter = new HeadingFilter({ getNumber: () => 1 / configService.config.minimumRequiredGpsAccuracyMeters })

    deviceSelectService.gpsSensor.locationData
      .pipe(filter(data => !!data && data.heading != undefined))
      .subscribe(locationData => {
        // always calculate filtered drift, even if we're not navigating.
        let filteredDrift = this.calculateFilteredHeadingDrift(locationData)
        this.compassDriftDegrees = filteredDrift;

        if (this.enabled && this.path && this.path.length) {
          let destination = this.path[0];
          let bearingToTarget = CoordinateUtils.calculateBearing(locationData.coords, destination)
          let distanceToTarget = CoordinateUtils.distanceBetweenPointsInMeters(destination, locationData.coords);

          this._desiredHeadingToDestination = bearingToTarget;

          if (distanceToTarget < configService.config.waypointProximityMeters) {
            this.pointReached.next();
            this.path.shift()
          }

          let correctedDestinationCompassHeading = CoordinateUtils.normalizeHeading(bearingToTarget + filteredDrift)
          orientationController.command(correctedDestinationCompassHeading)
        }
      })
  }


  private calculateFilteredHeadingDrift(locationData: GpsSensorData): number {
    let distanceSinceLastUpdate = 0;
    if (this.lastUpdateTime) {
      let deltaSeconds = (locationData.timestamp - this.lastUpdateTime) / 1000;
      distanceSinceLastUpdate = locationData.speedMps * deltaSeconds;
      this.totalDistanceTraveled += distanceSinceLastUpdate;
    }
    this.lastUpdateTime = locationData.timestamp;
    // normally the lowpass filter is used to average changes over a given time period. However
    // in this case we want to average the drift between the compass heading and the GPS location history
    // heading over a given travel distance, not over a given time period.  Thus using total distance
    // traveled in place of time.
    let compassDrift = this.orientationSensor.heading.value.heading - locationData.heading;
    return this.compassDriftFilter.process(compassDrift, this.totalDistanceTraveled);
  }


  command(path: LatLon[]): void {
    this.path = path;
  }


  stop(): void {
    this.path = undefined;
  }

}
