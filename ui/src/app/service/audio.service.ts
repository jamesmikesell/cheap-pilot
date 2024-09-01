import { Injectable } from '@angular/core';
import { distinctUntilChanged, map, merge } from 'rxjs';
import { RemoteService } from '../remote/remote-service';
import { ConfigService } from './config.service';
import { ControllerPathService } from './controller-path.service';
import { DeviceSelectService } from './device-select.service';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  private singleBeep: HTMLAudioElement;
  private doubleBeep: HTMLAudioElement;


  constructor(
    private deviceSelectService: DeviceSelectService,
    private remoteService: RemoteService,
    private pathController: ControllerPathService,
    private configService: ConfigService,
  ) {
    this.initAudioFiles()

    this.listenForBtDisconnect();
    this.listenForRouteFinished();
  }


  private listenForBtDisconnect(): void {
    let remoteConnected = this.remoteService.stateBroadcastReceived
      .pipe(map(state => state.displayStats.bluetoothConnected))

    let previouslyConnected = false;
    merge(remoteConnected, this.deviceSelectService.motorController.connected)
      .pipe(distinctUntilChanged())
      .subscribe(connected => {
        if (!connected && previouslyConnected && this.configService.config.alertOnBluetoothDisconnect) {
          navigator.vibrate([500, 50, 500, 50, 500, 50, 500, 50, 500, 50, 500])
          void this.singleBeep.play();
        }
        previouslyConnected = connected;
      })
  }


  private listenForRouteFinished(): void {
    let remotePathControllerOn = this.remoteService.stateBroadcastReceived
      .pipe(map(state => state.path && !!state.path.length))
      .pipe(distinctUntilChanged())

    let localPathControllerOn = this.pathController.pathSubscription
      .pipe(map(path => path && !!path.length))
      .pipe(distinctUntilChanged())

    let previouslyNavigating = false;
    merge(remotePathControllerOn, localPathControllerOn)
      .pipe(distinctUntilChanged())
      .subscribe(navigating => {
        if (!navigating && previouslyNavigating && this.configService.config.alertOnNavigationEnd) {
          navigator.vibrate([200, 50, 200])
          void this.doubleBeep.play();
        }
        previouslyNavigating = navigating;
      })
  }


  private initAudioFiles(): void {
    this.singleBeep = new Audio();
    this.singleBeep.src = 'assets/beep.mp3';
    this.singleBeep.load();

    this.doubleBeep = new Audio();
    this.doubleBeep.src = 'assets/double-beep.mp3';
    this.doubleBeep.load();
  }



}
