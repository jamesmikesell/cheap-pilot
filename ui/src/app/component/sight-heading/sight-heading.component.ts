import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { HeadingFilter } from 'src/app/service/filter';
import { SensorOrientationService } from 'src/app/service/sensor-orientation.service';
import { CoordinateUtils } from 'src/app/utils/coordinate-utils';

@Component({
  selector: 'app-sight-heading',
  templateUrl: './sight-heading.component.html',
  styleUrl: './sight-heading.component.scss'
})
export class SightHeadingComponent implements OnInit, OnDestroy {

  heading: number = 0;
  source: number;
  destination: number = undefined;
  stream: MediaStream;

  @Output() canceled = new EventEmitter<void>()
  @Output() headingChange = new EventEmitter<number>()

  @ViewChild("uxVideo")
  private uxVideo: ElementRef<HTMLVideoElement>;
  private headingFilter = new HeadingFilter(1)
  private destroy = new Subject<void>();


  constructor(
    private sensorDeviceOrientation: SensorOrientationService,
  ) { }


  ngOnInit(): void {
    this.sensorDeviceOrientation.deviceFacingHeading
      .pipe(takeUntil(this.destroy))
      .subscribe(headingRaw => {
        let filteredHeading = CoordinateUtils.normalizeHeading(this.headingFilter.process(headingRaw.heading, headingRaw.time))
        this.heading = filteredHeading;
      })

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then(stream => {
        this.stream = stream;
        this.uxVideo.nativeElement.srcObject = stream;
      })
      .catch(err => console.error("Error accessing the camera: ", err));
  }


  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();

    if (this.stream && this.stream.getTracks) {
      this.uxVideo.nativeElement.pause();

      this.stream.getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
    }
  }


  handleButtonClick(): void {
    if (this.destination === undefined) {
      this.vibrate()
      this.destination = this.heading;
    } else {
      this.vibrate()
      this.source = this.heading;
    }

    if (this.source !== undefined) {
      this.headingChange.next(this.destination - this.source)

      this.source = undefined;
      this.destination = undefined
    }
  }


  private vibrate(): void {
    navigator.vibrate([50]);
  }


  cancelButton(): void {
    this.source = undefined;
    this.destination = undefined
    this.canceled.next();
  }

}
