import { Injectable } from '@angular/core';
import { CoordinateUtils } from '../utils/coordinate-utils';
import { ControllerOrientationService } from './controller-orientation.service';
import { ControllerPathService } from './controller-path.service';
import { ControllerRotationRateService } from './controller-rotation-rate.service';

@Injectable({
  providedIn: 'root'
})
export class ManualControlService {

  constructor(
    private controllerOrientation: ControllerOrientationService,
    private controllerRotationRate: ControllerRotationRateService,
    private controllerPath: ControllerPathService,
  ) {
  }



  maintainCurrentHeadingLocal(): void {
    this.controllerPath.stop()
    this.controllerOrientation.enabled = true;
    this.controllerOrientation.maintainCurrentHeading();
  }


  moveManuallyLocal(level: number): void {
    this.controllerPath.stop()
    if (this.controllerOrientation.enabled) {
      this.controllerOrientation.command(CoordinateUtils.normalizeHeading(this.controllerOrientation.desired - (level * 5)));
    } else {
      this.controllerRotationRate.enabled = true;
      this.controllerRotationRate.command(this.controllerRotationRate.desired + level);
    }
  }


  stopManuallyLocal(): void {
    this.controllerPath.stop()
    this.controllerRotationRate.cancelPidTune();
    this.controllerOrientation.cancelPidTune();

    if (this.controllerOrientation.enabled)
      this.controllerOrientation.enabled = false;

    if (this.controllerRotationRate.enabled && this.controllerRotationRate.desired === 0)
      this.controllerRotationRate.enabled = false;

    this.controllerRotationRate.command(0)
  }


  offsetCurrentHeading(offset: number) {
    this.maintainCurrentHeadingLocal()
    let current = this.controllerOrientation.desired;
    this.controllerOrientation.command(current + offset)
  }

}
