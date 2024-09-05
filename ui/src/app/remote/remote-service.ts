import { Injectable } from "@angular/core";
import { plainToInstance } from "class-transformer";
import { BehaviorSubject, distinctUntilChanged, interval, map, skip, takeUntil } from "rxjs";
import { ConfigService, RemoteReceiverMode } from "../service/config.service";
import { LatLon } from "../utils/coordinate-utils";
import { StatsBroadcast } from "./message-dtos";
import { MessagingService } from "./messaging-service";
import { RemoteMessageTopics } from "./receiver-service";

@Injectable({
  providedIn: 'root'
})
export class RemoteService {


  lastStateBroadcastReceived = new BehaviorSubject<StatsBroadcast>(undefined);


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
        this.messageService.getMessagesForTopic(RemoteMessageTopics.BROADCAST_STATE)
          .pipe(takeUntil(isRemoteModeChanges.pipe(skip(1))))
          .pipe(map(plain => plainToInstance(StatsBroadcast, plain)))
          .subscribe(message => this.lastStateBroadcastReceived.next(message))

        setTimeout(() => {
          this.requestUpdate();
        }, 100);
      }
    })
  }


  private requestUpdate() {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE)
      void this.messageService.sendMessage(RemoteMessageTopics.REQUEST_UPDATE, "")
  }


  sendNavigationPath(navCoordinates: LatLon[]) {
    void this.messageService.sendMessage(RemoteMessageTopics.NAVIGATE_ROUTE, navCoordinates);
  }

}