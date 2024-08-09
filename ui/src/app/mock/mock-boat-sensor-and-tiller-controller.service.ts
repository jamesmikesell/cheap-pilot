import { Injectable } from "@angular/core";
import { BehaviorSubject, timer } from "rxjs";
import { ConfigService } from "../service/config.service";
import { Controller } from "../service/controller";
import { ConnectableDevice } from "../service/controller-bt-motor.service";
import { CoordinateUtils, LatLon } from "../service/coordinate-utils";
import { GpsSensor, GpsSensorData } from "../service/sensor-gps.service";
import { HeadingAndTime, OrientationSensor } from "../service/sensor-orientation.service";
import { UnitConverter } from "../service/unit-converter";


@Injectable({
  providedIn: 'root'
})
export class MockBoatSensorAndTillerController {

  private moveQueue: SensorWithNoise[] = [
    new SensorWithNoise(INITIAL_HEADING, INITIAL_HEADING, 0),
    new SensorWithNoise(INITIAL_HEADING, INITIAL_HEADING, 1)
  ];
  private tillerGainDegreesPerSecond = 0;
  private nextTillerDegreesPerSecond = 0;
  private previousTime: number;
  private heading = new BehaviorSubject<HeadingAndTime>(new HeadingAndTime(0, INITIAL_HEADING));
  private tillerAngle = -0.1;
  private connected = new BehaviorSubject<boolean>(true);
  private locationData = new BehaviorSubject<GpsSensorData>(undefined);
  private startLocation: LatLon = { latitude: 40, longitude: -80 };

  constructor(
    private configService: ConfigService,
  ) {
    setTimeout(() => {
      this.connected.next(true);
    }, 1000);

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

        let currentHeading = this.moveQueue[this.moveQueue.length - 1].real;
        currentHeading -= this.tillerAngle * (dt / 1000) * this.configService.config.simulationSpeedKt;
        currentHeading = currentHeading % 360;
        if (currentHeading < 0)
          currentHeading = 360 + currentHeading;

        let distanceMeters = UnitConverter.ktToMps(this.configService.config.simulationSpeedKt) * dt / 1000;

        let newLocation: LatLon;
        let newSpeed: number; // making these nullable as we won't have speed / heading in real life until we've moved
        let newHeading: number; // ^^^^^
        if (this.locationData.value) {
          newLocation = CoordinateUtils.calculateNewPosition(this.locationData.value.coords, distanceMeters, currentHeading);
          let distanceSinceStart = CoordinateUtils.haversineDistanceInMeters(this.locationData.value.coords, this.startLocation);
          if (distanceSinceStart > 5) {
            newSpeed = this.configService.config.simulationSpeedKt;
            newHeading = Math.round(currentHeading);
          }
        } else {
          newLocation = this.startLocation;
        }

        this.locationData.next({
          coords: {
            accuracy: 6,
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
          },
          timestamp: now,
          heading: newHeading,
          speedMps: newSpeed,
        })


        const headingWithNoise = currentHeading + (Math.random() - 0.5) * this.configService.config.simulationNoiseAmplitude;
        this.moveQueue.push(new SensorWithNoise(currentHeading, headingWithNoise, now));
        if (this.moveQueue.length > 5) {
          this.moveQueue.shift();
        }

        this.previousTime = now;
        this.heading.next(new HeadingAndTime(now, headingWithNoise));
      })


  }


  getGpsSensor(): GpsSensor {
    let self = this;
    return {
      locationData: self.locationData,
    }
  }


  getOrientationSensor(): OrientationSensor {
    let self = this;
    return {
      heading: self.heading,
    }
  }


  getMotorController(): Controller & ConnectableDevice {
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
    let end = this.moveQueue[this.moveQueue.length - 1];
    let start = this.moveQueue[this.moveQueue.length - 2];
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


class SensorWithNoise {
  constructor(
    public real: number,
    public withNoise: number,
    public time: number,
  ) { }
}


const INITIAL_HEADING = 30;
