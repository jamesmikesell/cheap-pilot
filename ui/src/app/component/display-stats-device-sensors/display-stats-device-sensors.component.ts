import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { DisplayStatsService } from 'src/app/service/display-stats.service';
import { DisplayStats } from '../display-stats/display-stats.component';

@Component({
  selector: 'app-display-stats-device-sensors',
  templateUrl: './display-stats-device-sensors.component.html',
  styleUrls: ['./display-stats-device-sensors.component.scss']
})
export class DisplayStatsDeviceSensorsComponent implements OnInit, OnDestroy {

  displayStats: DisplayStats;


  private destroy = new Subject<void>();


  constructor(
    private displayStatService: DisplayStatsService,
  ) { }


  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }


  ngOnInit(): void {
    this.displayStatService.displayStats
      .pipe(takeUntil(this.destroy))
      .subscribe(stats => this.displayStats = stats)
  }
}
