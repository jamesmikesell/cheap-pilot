import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { ConfigService, RemoteReceiverMode } from 'src/app/service/config.service';
import { Controller } from 'src/app/service/controller';
import { ConnectableDevice } from 'src/app/service/controller-bt-motor.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerPathService } from 'src/app/service/controller-path.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { NavBarService } from 'src/app/service/nav-bar.service';
import { CoordinateUtils } from 'src/app/utils/coordinate-utils';

@Component({
  selector: 'app-full-screen-map',
  templateUrl: './full-screen-map.component.html',
  styleUrls: ['./full-screen-map.component.scss']
})
export class FullScreenMapComponent implements OnInit, OnDestroy {

  motorControllerService: Controller<number> & ConnectableDevice;
  RemoteReceiverMode = RemoteReceiverMode;
  showOverlay = false;


  private destroy = new Subject<void>();


  constructor(
    private navBarService: NavBarService,
    public controllerOrientation: ControllerOrientationService,
    public controllerRotationRate: ControllerRotationRateService,
    private controllerPath: ControllerPathService,
    deviceSelectService: DeviceSelectService,
    public configService: ConfigService,
  ) {
    this.motorControllerService = deviceSelectService.motorController;
  }


  ngOnDestroy(): void {
    this.navBarService.showNavBar = true;
    this.destroy.next();
    this.destroy.complete();
  }


  ngOnInit(): void {
    this.navBarService.showNavBar = false;
  }


  maintainCurrentHeading(): void {
    this.controllerPath.stop()
    this.controllerOrientation.enabled = true;
    this.controllerOrientation.maintainCurrentHeading();
  }


  moveManually(level: number): void {
    this.controllerPath.stop()
    this.vibrate();
    if (this.controllerOrientation.enabled) {
      this.controllerOrientation.command(CoordinateUtils.normalizeHeading(this.controllerOrientation.desired - (level * 5)));
    } else {
      this.controllerRotationRate.enabled = true;
      this.controllerRotationRate.command(this.controllerRotationRate.desired + level);
    }
  }


  stopManually(): void {
    this.controllerPath.stop()
    this.controllerRotationRate.cancelPidTune();
    this.controllerOrientation.cancelPidTune();

    if (this.controllerOrientation.enabled)
      this.controllerOrientation.enabled = false;

    if (this.controllerRotationRate.enabled && this.controllerRotationRate.desired === 0)
      this.controllerRotationRate.enabled = false;

    this.controllerRotationRate.command(0)

    this.vibrate();
  }


  private vibrate(): void {
    navigator.vibrate([50]);
  }
}
