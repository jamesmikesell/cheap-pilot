import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SensorOrientationService implements OrientationSensor {

  heading = new BehaviorSubject<HeadingAndTime>(new HeadingAndTime(0, 0));


  constructor() {
    window.addEventListener('deviceorientationabsolute', (eventData) => this.orientationChanged(eventData));
  }

  private orientationChanged(event: DeviceOrientationEvent): void {
    this.heading.next(new HeadingAndTime(event.timeStamp, 360 - event.alpha));
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
