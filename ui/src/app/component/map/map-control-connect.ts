import { Injectable } from "@angular/core";
import * as L from "leaflet";
import { Controller } from "src/app/service/controller";
import { ConnectableDevice } from "src/app/service/controller-bt-motor.service";
import { DeviceSelectService } from "src/app/service/device-select.service";
import { ControlType } from "./map.component";
import { distinctUntilChanged, interval, map, merge, Subject, takeUntil } from "rxjs";
import { ConfigService, RemoteReceiverMode } from "src/app/service/config.service";


@Injectable({
  providedIn: 'root'
})
export class MapControlConnect {

  private motorControllerService: Controller<number> & ConnectableDevice;


  constructor(
    deviceSelectService: DeviceSelectService,
    private configService: ConfigService,
  ) {
    this.motorControllerService = deviceSelectService.motorController;
  }


  getControl(destroy: Subject<any>): ControlType {
    return L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        const button = L.DomUtil.create('a', 'leaflet-menu-button', container);
        button.href = '#';

        let remoteModeChangeListener = interval(100)
          .pipe(map(() => this.configService.config.remoteReceiverMode))
          .pipe(distinctUntilChanged());

        merge(
          remoteModeChangeListener,
          this.motorControllerService.connected,
        ).pipe(takeUntil(destroy))
          .subscribe(() => {
            button.style.backgroundColor = null;
            if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE) {
              button.innerHTML = '<span class="material-icons">settings_remote</span>';
            } else {
              if (this.motorControllerService.connected.value) {
                button.innerHTML = '<span class="material-icons">bluetooth_connected</span>';
              } else {
                button.innerHTML = '<span class="material-icons">bluetooth</span>';
                button.style.backgroundColor = "#ff5757";
              }
            }
          })


        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.stop(e);
          this.handleButtonClick()
        });

        return container;
      }
    });
  }


  private handleButtonClick(): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE)
      return;

    if (this.motorControllerService.connected.value)
      this.motorControllerService.disconnect();
    else
      this.motorControllerService.connect();
  }

}
