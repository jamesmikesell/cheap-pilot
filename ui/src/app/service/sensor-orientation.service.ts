import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CoordinateUtils } from '../utils/coordinate-utils';

@Injectable({
  providedIn: 'root'
})
export class SensorOrientationService implements OrientationSensor {

  heading = new BehaviorSubject<HeadingAndTime>(new HeadingAndTime(0, 0));
  deviceFacingHeading = new BehaviorSubject<HeadingAndTime>(new HeadingAndTime(0, 0));


  private relativeListener: (eventData: DeviceOrientationEvent) => void;


  constructor() {
    window.addEventListener('deviceorientationabsolute', (eventData) => this.orientationChanged(eventData, true));

    this.relativeListener = (eventData: DeviceOrientationEvent) => this.orientationChanged(eventData, false);
    window.addEventListener('deviceorientation', this.relativeListener);
  }


  private orientationChanged(event: DeviceOrientationEvent, absolute: boolean): void {
    if (absolute) {
      window.removeEventListener('deviceorientation', this.relativeListener);
    }

    this.heading.next(new HeadingAndTime(event.timeStamp, 360 - event.alpha));

    let deviceFaceHeadingRaw = CoordinateUtils.getCompassHeadingDeviceIsFacing(event.alpha, event.beta, event.gamma)
    this.deviceFacingHeading.next(new HeadingAndTime(event.timeStamp, deviceFaceHeadingRaw));
  }


  // This has to be triggered from a click event
  static requestOrientationPermission(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      void (DeviceOrientationEvent as any).requestPermission()
    } catch (error) {
      console.error(error)
    }
  }


}


export class HeadingAndTime {
  constructor(
    public time: number,
    public heading: number,
  ) { }
}


export interface OrientationSensor {
  heading: BehaviorSubject<HeadingAndTime>;
}
