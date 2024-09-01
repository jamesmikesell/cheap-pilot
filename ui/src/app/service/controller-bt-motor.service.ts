import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Controller } from './controller';

@Injectable({
  providedIn: 'root'
})
export class ControllerBtMotorService implements Controller<number>, ConnectableDevice {

  connected = new BehaviorSubject<boolean>(false);

  private characteristic: BluetoothRemoteGATTCharacteristic;
  private nextPowerLevel = 0;
  private gatt: BluetoothRemoteGATTServer;

  constructor(
  ) {
    window.addEventListener("beforeunload", () => this.disconnect())

    void this.initSendTimer();
  }


  private async initSendTimer(): Promise<void> {
    const sendInterval = 200;
    const timeoutMs = 1000;
    while (true) {
      const start = Date.now();

      if (this.connected.value) {
        const direction = this.nextPowerLevel > 0 ? Direction.RIGHT : Direction.LEFT;
        let btSendPromise = this.move(direction, Math.abs(this.nextPowerLevel))
          .catch(e => console.error("error sending bt message", e))
          .then(() => false)

        let timeoutPromise = this.sleep(timeoutMs)
          .then(() => true)

        let timedOut = await Promise.race([btSendPromise, timeoutPromise]);
        if (timedOut === true)
          console.error(`BT command send timed out after ${timeoutMs}ms`)
      }

      const remainingTime = sendInterval - (Date.now() - start);
      await this.sleep(Math.max(0, remainingTime));
    }
  }


  private async sleep(timeMs: number): Promise<void> {
    await new Promise(r => setTimeout(r, timeMs))
  }


  disconnect(): void {
    if (this.gatt) {
      this.characteristic = undefined;
      this.connected.next(false);
      this.gatt.disconnect();
      this.gatt = undefined;
    }
  }


  async connect(): Promise<void> {
    const SERVICE_UUID = "dc05a09d-4d38-4ea9-af54-1add36c9a987"
    const CHARACTERISTIC_UUID = "c460751e-342b-4700-96ce-190ac0ac526e"

    let config: RequestDeviceOptions = {
      filters: [
        {
          services: [SERVICE_UUID],
        }
      ],
      optionalServices: [SERVICE_UUID]
    };

    try {
      let device = await navigator.bluetooth.requestDevice(config);
      this.gatt = device.gatt;
      device.addEventListener("gattserverdisconnected", () => this.bluetoothDisconnected());
      console.log('Connecting to GATT Server...');
      let server = await device.gatt.connect();
      console.log('Getting Service...');
      let service = await server.getPrimaryService(SERVICE_UUID);
      console.log('Getting Characteristic...');
      this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      this.connected.next(true);
    } catch (error) {
      console.error(error);
    }
  }


  private async move(direction: Direction, powerPercent: number): Promise<void> {
    let level = Math.round(powerPercent * 255);
    await this.characteristic.writeValueWithoutResponse(new Uint8Array([level, direction]));
  }


  command(level: number): void {
    this.nextPowerLevel = level;
  }

  stop(): void {
    this.command(0);
  }


  private bluetoothDisconnected(): void {
    this.characteristic = undefined;
    this.connected.next(false);
  }

}


enum Direction {
  RIGHT = 1,
  LEFT = 0,
}

export interface ConnectableDevice {
  connected: BehaviorSubject<boolean>;

  connect(): Promise<void>
  disconnect(): void;
}