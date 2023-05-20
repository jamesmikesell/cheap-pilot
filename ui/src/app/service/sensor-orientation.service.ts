import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SensorOrientationService {

  desired = 0;
  current = 0
  update = new Subject<void>();

  private lastUpdateTime = Date.now();

  constructor() {
    window.addEventListener('deviceorientation', (eventData) => this.orientationChanged(eventData));
  }

  private orientationChanged(event: DeviceOrientationEvent): void {

    if (Date.now() - this.lastUpdateTime > 200) {
      this.lastUpdateTime = Date.now();
      this.current = event.alpha;
      this.update.next();
    }
  }

  getError(): number {
    let error = this.current - this.desired;
    if (error > 180)
      error = error - 360;
    if (error < -180)
      error = error + 360;

    return -error;
  }

}
