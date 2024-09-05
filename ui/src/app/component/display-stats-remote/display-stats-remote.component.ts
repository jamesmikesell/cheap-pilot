import { Component, OnDestroy, OnInit } from '@angular/core';
import { filter, Subject, takeUntil } from 'rxjs';
import { RemoteService } from 'src/app/remote/remote-service';
import { DisplayStats } from '../display-stats/display-stats.component';

@Component({
  selector: 'app-display-stats-remote',
  templateUrl: './display-stats-remote.component.html',
  styleUrl: './display-stats-remote.component.scss'
})
export class DisplayStatsRemoteComponent implements OnInit, OnDestroy {

  displayStats: DisplayStats;


  private destroy = new Subject<void>();


  constructor(
    private remoteService: RemoteService,
  ) { }


  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }


  ngOnInit(): void {
    this.remoteService.lastStateBroadcastReceived
      .pipe(takeUntil(this.destroy))
      .pipe(filter(state => !!state))
      .subscribe(stats => this.displayStats = stats.displayStats)
  }
}
