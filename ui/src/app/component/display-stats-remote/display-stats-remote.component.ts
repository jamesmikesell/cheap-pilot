import { Component, OnDestroy, OnInit } from '@angular/core';
import { plainToInstance } from 'class-transformer';
import { map, Subject, takeUntil } from 'rxjs';
import { StatsBroadcast } from 'src/app/remote/message-dtos';
import { MessagingService } from 'src/app/remote/messaging-service';
import { RemoteMessageTopics } from 'src/app/remote/receiver-service';
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
    private messagingService: MessagingService,
  ) { }


  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }


  ngOnInit(): void {
    this.messagingService.getMessagesForTopic(RemoteMessageTopics.BROADCAST_STATE)
      .pipe(takeUntil(this.destroy))
      .pipe(map(plain => plainToInstance(StatsBroadcast, plain)))
      .subscribe(stats => this.displayStats = stats.displayStats)
  }
}
