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
    if (SensorOrientationService.supportsAbsoluteOrientation())
      window.addEventListener('deviceorientationabsolute', (eventData) => this.orientationChanged(eventData));
    else
      window.addEventListener('deviceorientation', (eventData) => this.orientationChanged(eventData));
  }

  private orientationChanged(event: DeviceOrientationEvent): void {
    this.heading.next(new HeadingAndTime(event.timeStamp, 360 - event.alpha));

    let deviceFaceHeadingRaw = CoordinateUtils.getCompassHeadingDeviceIsFacing(event.alpha, event.beta, event.gamma)
    this.deviceFacingHeading.next(new HeadingAndTime(event.timeStamp, deviceFaceHeadingRaw));
  }


  /** This is a hack... ios has a method which is required to request permission to the orientation sensor.  ios doesn't currently
   * support absolute orientation.  therefore if the method to request orientation permission exists, assume device can't
   * provide absolute orientation.
   */
  static supportsAbsoluteOrientation(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return !(DeviceOrientationEvent as any).requestPermission;
  }


  // This has to be triggered from a click event
  static requestOrientationPermission(): void {
    if (!this.supportsAbsoluteOrientation()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      void (DeviceOrientationEvent as any).requestPermission()
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
