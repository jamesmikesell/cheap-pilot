import { Injectable } from "@angular/core";
import { BehaviorSubject, timer } from "rxjs";
import { ConfigService } from "../service/config.service";
import { Controller } from "../service/controller";
import { ConnectableDevice } from "../service/controller-bt-motor.service";
import { CoordinateUtils, LatLon } from "../service/coordinate-utils";
import { LocationData, LocationHistoryTracker } from "../service/location-history-calculator";
import { GpsSensor, GpsSensorData } from "../service/sensor-gps.service";
import { HeadingAndTime, OrientationSensor } from "../service/sensor-orientation.service";
import { UnitConverter } from "../service/unit-converter";


@Injectable({
  providedIn: 'root'
})
export class MockBoatSensorAndTillerController {

  private headingHistory: HeadingWithNoise[] = [
    { real: 0, noisy: 0, time: 0 },
    { real: 0, noisy: 0, time: 1 },
  ];
  private tillerGainDegreesPerSecond = 0;
  private nextTillerDegreesPerSecond = 0;
  private previousTime: number;
  private heading;
  private tillerAngle = -0.1;
  private connected = new BehaviorSubject<boolean>(false);
  private locationData = new BehaviorSubject<PositionWithNoise>(undefined);
  private startLocation: LatLon = { latitude: 40.00, longitude: -80.00 };
  private locationTrackerNoisy;


  constructor(
    private configService: ConfigService,
  ) {
    this.locationTrackerNoisy = new LocationHistoryTracker({ getNumber: () => configService.config.minimumRequiredGpsAccuracyMeters });
    this.heading = new BehaviorSubject<HeadingAndTime>(new HeadingAndTime(0, this.configService.config.simulationCompassDrift))

    // This simulates how the we only send control updates to the bluetooth motor every 200ms
    timer(0, 200)
      .subscribe(() => {
        this.tillerGainDegreesPerSecond = this.nextTillerDegreesPerSecond;
      });

    timer(0, 50)
      .subscribe(() => {
        const now = performance.now();
        if (!this.previousTime) {
          this.previousTime = now;
          return;
        }

        const dt = now - this.previousTime;
        this.tillerAngle += this.tillerGainDegreesPerSecond * (dt / 1000);

        let headingReal = this.headingHistory[this.headingHistory.length - 1].real;
        headingReal -= this.tillerAngle * (dt / 1000) * this.configService.config.simulationSpeedKt;
        headingReal = CoordinateUtils.normalizeHeading(headingReal)

        this.calculateGpsPosition(headingReal, now, dt);

        const headingNoisy = headingReal + this.configService.config.simulationCompassDrift + (Math.random() - 0.5) * this.configService.config.simulationNoiseAmplitude;
        this.headingHistory.push({ real: headingReal, noisy: headingNoisy, time: now });
        if (this.headingHistory.length > 5) {
          this.headingHistory.shift();
        }

        this.previousTime = now;
        this.heading.next(new HeadingAndTime(now, headingNoisy));
      })
  }


  private calculateGpsPosition(heading: number, time: number, timeDelta: number): void {
    let distanceMeters = UnitConverter.ktToMps(this.configService.config.simulationSpeedKt) * timeDelta / 1000;

    let accuracy = this.configService.config.minimumRequiredGpsAccuracyMeters;
    let newLocationReal: LatLon;
    let newLocationNoisy: LatLon;
    if (this.locationData.value) {
      newLocationReal = CoordinateUtils.calculateNewPosition(this.locationData.value.real.coords, distanceMeters, heading);

      let distanceError = accuracy * Math.random();
      let angleError = 359 * Math.random();
      newLocationNoisy = CoordinateUtils.calculateNewPosition(newLocationReal, distanceError, angleError);
    } else {
      newLocationReal = this.startLocation;
      newLocationNoisy = this.startLocation;
    }


    this.locationData.next({
      real: {
        coords: {
          accuracy: accuracy,
          latitude: newLocationReal.latitude,
          longitude: newLocationReal.longitude,
        },
        timestamp: time,
      },
      noisy: {
        coords: {
          accuracy: accuracy,
          latitude: newLocationNoisy.latitude,
          longitude: newLocationNoisy.longitude,
        },
        timestamp: time,
      },
    })
  }


  getGpsSensor(): GpsSensor {
    let locationNoisy = new BehaviorSubject<GpsSensorData>(undefined);
    timer(0, 1000)
      .subscribe(() => {
        if (this.locationData.value?.noisy) {
          let location = this.locationData.value.noisy;
          this.locationTrackerNoisy.tryAddLocationToHistory(location);
          let gpsDataNoisy: GpsSensorData = {
            coords: location.coords,
            timestamp: location.timestamp,
            speedMps: this.locationTrackerNoisy.getSpeedMpsFromHistory(),
            heading: this.locationTrackerNoisy.getHeadingFromHistory(),
          };
          locationNoisy.next(gpsDataNoisy)
        } else {
          locationNoisy.next(undefined)
        }
      })

    return {
      locationData: locationNoisy,
    }
  }


  getOrientationSensor(): OrientationSensor {
    let self = this;
    return {
      heading: self.heading,
    }
  }


  getMotorController(): Controller<number> & ConnectableDevice {
    let self = this;
    return {
      command(level: number) { self.command(level) },
      connect(): Promise<void> { return self.connect() },
      connected: self.connected,
      disconnect() { self.disconnect() },
      stop() { self.stop() },
    }
  }


  private getGetRotationAmount(currentAngle: number, previousAngle: number): number {
    let delta = currentAngle - previousAngle;
    if (delta > 180)
      delta = delta - 360;
    if (delta < -180)
      delta = delta + 360;

    return -delta;
  }


  rotationRateReal(): number {
    let end = this.headingHistory[this.headingHistory.length - 1];
    let start = this.headingHistory[this.headingHistory.length - 2];
    let rotation = this.getGetRotationAmount(end.real, start.real);
    return rotation / ((end.time - start.time) / 1000);
  }


  private command(level: number): void {
    this.nextTillerDegreesPerSecond = level * 0.2;
  }


  private stop(): void {
    this.nextTillerDegreesPerSecond = 0;
  }


  private connect(): Promise<void> {
    this.connected.next(true);
    return Promise.resolve();
  }


  private disconnect(): void {
    this.connected.next(false);
  }

}


interface HeadingWithNoise {
  real: number;
  noisy: number;
  time: number;
}


interface PositionWithNoise {
  real: LocationData;
  noisy: LocationData;
}
