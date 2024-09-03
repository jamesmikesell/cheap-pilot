import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CoordinateUtils } from '../utils/coordinate-utils';

@Injectable({
  providedIn: 'root'
})
export class SensorOrientationService implements OrientationSensor {

  heading = new BehaviorSubject<HeadingAndTime>(new HeadingAndTime(0, 0));
  deviceFacingHeading = new BehaviorSubject<HeadingAndTime>(new HeadingAndTime(0, 0));


  constructor() {
    window.addEventListener('deviceorientationabsolute', (eventData) => this.orientationChanged(eventData));
  }

  private orientationChanged(event: DeviceOrientationEvent): void {
    this.heading.next(new HeadingAndTime(event.timeStamp, 360 - event.alpha));

    let deviceFaceHeadingRaw = CoordinateUtils.getCompassHeadingDeviceIsFacing(event.alpha, event.beta, event.gamma)
    this.deviceFacingHeading.next(new HeadingAndTime(event.timeStamp, deviceFaceHeadingRaw));
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
