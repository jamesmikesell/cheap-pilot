import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { ConfigService, RemoteReceiverMode } from 'src/app/service/config.service';
import { Controller } from 'src/app/service/controller';
import { ConnectableDevice } from 'src/app/service/controller-bt-motor.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { NavBarService } from 'src/app/service/nav-bar.service';

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


}
