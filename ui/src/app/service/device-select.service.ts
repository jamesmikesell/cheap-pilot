import { Injectable } from '@angular/core';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { ConfigService } from './config.service';
import { Controller } from './controller';
import { ConnectableDevice, ControllerBtMotorService } from './controller-bt-motor.service';
import { GpsSensor, GpsSensorData, SensorGpsService } from './sensor-gps.service';
import { HeadingAndTime, OrientationSensor, SensorOrientationService } from './sensor-orientation.service';
import { BehaviorSubject, distinctUntilChanged, interval, map, merge, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeviceSelectService {

  motorController: Controller<number> & ConnectableDevice;
  orientationSensor: OrientationSensor;
  gpsSensor: GpsSensor;


  private simulationModeChange: Observable<boolean>;


  constructor(
    public mockBoat: MockBoatSensorAndTillerController,
    private realOrientationService: SensorOrientationService,
    private realBtMotorController: ControllerBtMotorService,
    private realGpsSensor: SensorGpsService,
    private configService: ConfigService,
  ) {

    this.simulationModeChange = interval(100)
      .pipe(map(() => configService.config.simulation))
      .pipe(distinctUntilChanged());

    this.motorController = this.motorControllerProxy();
    this.orientationSensor = this.orientationSensorProxy();
    this.gpsSensor = this.gpsSensorProxy();
  }



  private gpsSensorProxy(): GpsSensor {
    let mock = this.mockBoat.getGpsSensor();
    let real = this.realGpsSensor;

    let currentDevice = (): GpsSensor => {
      if (this.configService.config.simulation)
        return mock;
      else
        return real;
    }


    let LocationDataState = new BehaviorSubject<GpsSensorData>(currentDevice().locationData.value);
    merge(
      this.simulationModeChange,
      mock.locationData,
      real.locationData,
    )
      .pipe(map(() => currentDevice().locationData.value))
      .pipe(distinctUntilChanged())
      .subscribe(locationData => LocationDataState.next(locationData));

    return {
      locationData: LocationDataState
    }
  }



  private orientationSensorProxy(): OrientationSensor {
    let mock = this.mockBoat.getOrientationSensor();
    let real = this.realOrientationService;

    let currentDevice = (): OrientationSensor => {
      if (this.configService.config.simulation)
        return mock;
      else
        return real;
    }


    let headingState = new BehaviorSubject<HeadingAndTime>(currentDevice().heading.value);
    merge(
      this.simulationModeChange,
      mock.heading,
      real.heading,
    )
      .pipe(map(() => currentDevice().heading.value))
      .pipe(distinctUntilChanged())
      .subscribe(heading => headingState.next(heading));

    return {
      heading: headingState,
    }
  }



  private motorControllerProxy(): Controller<number> & ConnectableDevice {
    let mock = this.mockBoat.getMotorController();
    let real = this.realBtMotorController;

    let currentDevice = (): Controller<number> & ConnectableDevice => {
      if (this.configService.config.simulation)
        return mock;
      else
        return real;
    }


    let connectedState = new BehaviorSubject<boolean>(currentDevice().connected.value);
    merge(
      this.simulationModeChange,
      mock.connected,
      real.connected,
    )
      .pipe(map(() => currentDevice().connected.value))
      .pipe(distinctUntilChanged())
      .subscribe(connected => connectedState.next(connected));


    return {
      command: (level) => currentDevice().command(level),
      connect: async (): Promise<void> => await currentDevice().connect(),
      get connected(): BehaviorSubject<boolean> {
        return connectedState;
      },
      disconnect: () => currentDevice().disconnect(),
      stop: () => currentDevice().stop(),
    }
  }

}


