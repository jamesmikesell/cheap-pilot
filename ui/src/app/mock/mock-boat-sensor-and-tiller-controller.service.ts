import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject, timer } from "rxjs";
import { Controller } from "../service/controller";
import { ControllerOrientationLogData } from "../service/controller-orientation.service";
import { DataLogService } from "../service/data-log.service";



@Injectable({
  providedIn: 'root'
})
export class MockBoatSensorAndTillerController implements Controller {


  desired = 0;
  currentHeading = 0;
  tillerAngle = 0;
  tillerGain = 0;
  update = new Subject<void>();
  connected = new BehaviorSubject<boolean>(true);
  enabled = false;
  get currentMotorPower(): number { return this.tillerGain };
  get current(): number { return this.currentHeading }

  constructor(
    private dataLog: DataLogService,
  ) {
    setTimeout(() => {
      this.connected.next(true);
    }, 1000);


    timer(0, 500)
      .subscribe(() => {
        this.tillerAngle += this.tillerGain;
        this.tillerAngle = Math.min(this.tillerAngle, 25);
        this.tillerAngle = Math.max(this.tillerAngle, -25);
        this.currentHeading += this.tillerAngle;
        this.currentHeading = this.currentHeading % 360;

        let logData = new ControllerOrientationLogData(
          this.desired,
          this.current,
          this.getError(),
          this.getError(),
          this.tillerGain,
          this.enabled,
          this.getAverageHeading(),
        )

        this.dataLog.logControllerOrientation(logData);


        this.update.next();
      })
  }


  command(level: number): void {
    this.tillerGain = level;
  }


  stop(): void {
    this.tillerGain = 0;
  }


  getError(): number {
    let error = this.current - this.desired;
    if (error > 180)
      error = error - 360;
    if (error < -180)
      error = error + 360;

    return error;
  }


  getAverageHeading(): number {
    return 0;
  }


  connect(): void {
    //do nothing
  }


  maintainCurrentHeading() {
    this.desired = this.current
    this.enabled = true;
  }


}