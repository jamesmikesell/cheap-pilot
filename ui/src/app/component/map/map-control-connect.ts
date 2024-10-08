import { Injectable } from "@angular/core";
import * as L from "leaflet";
import { distinctUntilChanged, filter, interval, map, merge, Subject, takeUntil, tap } from "rxjs";
import { RemoteService } from "src/app/remote/remote-service";
import { ConfigService, RemoteReceiverMode } from "src/app/service/config.service";
import { Controller } from "src/app/service/controller";
import { ConnectableDevice } from "src/app/service/controller-bt-motor.service";
import { DeviceSelectService } from "src/app/service/device-select.service";
import { ControlType } from "./map.component";


@Injectable({
  providedIn: 'root'
})
export class MapControlConnect {

  private motorControllerService: Controller<number> & ConnectableDevice;


  constructor(
    deviceSelectService: DeviceSelectService,
    private configService: ConfigService,
    private remoteService: RemoteService,
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
          .pipe(takeUntil(destroy))
          .pipe(map(() => this.configService.config.remoteReceiverMode))
          .pipe(distinctUntilChanged());

        let lastMessageReceiptTime: number = undefined;
        let remoteBtConnected = false;
        let remoteConnectionStatusChanged = this.remoteService.lastStateBroadcastReceived
          .pipe(takeUntil(destroy))
          .pipe(filter(state => !!state))
          .pipe(tap(state => {
            lastMessageReceiptTime = state.timestamp.getTime();
            remoteBtConnected = state.displayStats.bluetoothConnected
          }))

        merge(
          remoteModeChangeListener,
          this.motorControllerService.connected,
          remoteConnectionStatusChanged,
          interval(1000),
        ).pipe(takeUntil(destroy))
          .subscribe(() => {
            container.classList.remove("no-dark")
            button.classList.remove("bg-warn")
            button.style.height = null
            button.style.lineHeight = null
            if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE) {
              let timeAgo = "∞";
              let lastReceiptSecAgoRounded: number;
              if (lastMessageReceiptTime) {
                lastReceiptSecAgoRounded = Math.round((Date.now() - lastMessageReceiptTime) / 1000);
                let minAgo = Math.floor(lastReceiptSecAgoRounded / 60)
                let hourAgo = Math.floor(lastReceiptSecAgoRounded / 60 / 60)

                if (minAgo >= 60)
                  timeAgo = `${hourAgo}h`
                else if (lastReceiptSecAgoRounded >= 60)
                  timeAgo = `${minAgo}m`
                else if (lastReceiptSecAgoRounded >= 15)
                  timeAgo = `${lastReceiptSecAgoRounded}s`
                else
                  timeAgo = "now"
              }

              button.innerHTML = `<span class="material-icons">settings_remote</span> ${timeAgo}`;
              button.style.height = "46px"
              button.style.lineHeight = "1em"
              if (!remoteBtConnected || lastReceiptSecAgoRounded >= 15) {
                container.classList.add("no-dark")
                button.classList.add("bg-warn")
              }

            } else {
              if (this.motorControllerService.connected.value) {
                button.innerHTML = '<span class="material-icons">bluetooth_connected</span>';
              } else {
                button.innerHTML = '<span class="material-icons">bluetooth</span>';
                container.classList.add("no-dark")
                button.classList.add("bg-warn")
              }
            }
          })


        L.DomEvent.disableClickPropagation(button);
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
      void this.motorControllerService.connect();
  }

}
