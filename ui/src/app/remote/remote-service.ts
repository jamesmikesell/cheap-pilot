import { Injectable } from "@angular/core";
import { plainToInstance } from "class-transformer";
import { distinctUntilChanged, map, skip, Subject, takeUntil, timer } from "rxjs";
import { ConfigService, RemoteReceiverMode } from "../service/config.service";
import { LatLon } from "../utils/coordinate-utils";
import { PathUpdate, StatsBroadcast } from "./message-dtos";
import { MessagingService } from "./messaging-service";
import { RemoteMessageTopics } from "./receiver-service";

@Injectable({
  providedIn: 'root'
})
export class RemoteService {


  pathBroadcastReceived = new Subject<PathUpdate>();
  statBroadcastReceived = new Subject<StatsBroadcast>();


  constructor(
    private configService: ConfigService,
    private messageService: MessagingService,
  ) {
    document.addEventListener("visibilitychange", () => {
      // This means the app regained focus / power back on etc
      if (!document.hidden)
        this.requestUpdate();
    })

    let isRemoteModeChanges = interval(500)
      .pipe(map(() => this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE))
      .pipe(distinctUntilChanged())

    isRemoteModeChanges.subscribe(inRemoteMode => {
      if (inRemoteMode) {
        this.messageService.getMessagesForTopic(RemoteMessageTopics.BROADCAST_PATH_UPDATE)
          .pipe(takeUntil(isRemoteModeChanges.pipe(skip(1))))
          .pipe(map(plain => plainToInstance(PathUpdate, plain)))
          .subscribe(message => this.pathBroadcastReceived.next(message))

        this.messageService.getMessagesForTopic(RemoteMessageTopics.BROADCAST_STATS)
          .pipe(takeUntil(isRemoteModeChanges.pipe(skip(1))))
          .pipe(map(plain => plainToInstance(StatsBroadcast, plain)))
          .subscribe(message => this.statBroadcastReceived.next(message))
      }
    })
  }


  private requestUpdate() {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE)
      this.messageService.sendMessage(RemoteMessageTopics.REQUEST_UPDATE, "")
  }


  sendNavigationPath(navCoordinates: LatLon[]) {
    this.messageService.sendMessage(RemoteMessageTopics.NAVIGATE_ROUTE, navCoordinates);
  }

}