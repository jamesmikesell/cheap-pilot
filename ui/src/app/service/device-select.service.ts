import { Injectable } from '@angular/core';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { ConfigService } from './config.service';
import { Controller } from './controller';
import { ConnectableDevice, ControllerBtMotorService } from './controller-bt-motor.service';
import { GpsSensor, SensorGpsService } from './sensor-gps.service';
import { OrientationSensor, SensorOrientationService } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class DeviceSelectService {

  motorController: Controller & ConnectableDevice;
  orientationSensor: OrientationSensor;
  gpsSensor: GpsSensor;

  constructor(
    public mockBoat: MockBoatSensorAndTillerController,
    public realOrientationService: SensorOrientationService,
    public realBtMotorController: ControllerBtMotorService,
    public realGpsSensor: SensorGpsService,
    configService: ConfigService,
  ) {

    if (configService.config.simulation) {
      this.motorController = mockBoat.getMotorController();
      this.orientationSensor = mockBoat.getOrientationSensor();
      this.gpsSensor = mockBoat.getGpsSensor();
    } else {
      this.motorController = realBtMotorController;
      this.orientationSensor = realOrientationService;
      this.gpsSensor = realGpsSensor;
    }

  }

}


