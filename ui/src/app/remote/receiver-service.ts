import { Injectable } from "@angular/core";
import { instanceToPlain } from "class-transformer";
import { distinctUntilChanged, interval, map, skip, takeUntil, timer } from "rxjs";
import { ConfigService, RemoteReceiverMode } from "../service/config.service";
import { ControllerPathService } from "../service/controller-path.service";
import { DeviceSelectService } from "../service/device-select.service";
import { DisplayStatsService } from "../service/display-stats.service";
import { ManualControlService } from "../service/manual-control.service";
import { LatLon } from "../utils/coordinate-utils";
import { StatsBroadcast } from "./message-dtos";
import { MessagingService } from "./messaging-service";

@Injectable({
  providedIn: 'root'
})
export class ReceiverService {

  constructor(
    private configService: ConfigService,
    private messageService: MessagingService,
    private controllerPath: ControllerPathService,
    private displayStatsService: DisplayStatsService,
    private deviceSelectionService: DeviceSelectService,
    private manualControlService: ManualControlService,
  ) {

    let isReceiverModeChanges = interval(500)
      .pipe(map(() => this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER))
      .pipe(distinctUntilChanged())

    isReceiverModeChanges.subscribe(inReceiverMode => {
      if (inReceiverMode) {
        this.messageService.getMessagesForTopic(RemoteMessageTopics.MAINTAIN_CURRENT_HEADING)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(() => this.maintainHeading())

        this.messageService.getMessagesForTopic(RemoteMessageTopics.MOVE_MANUALLY)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(payload => this.moveManually(payload as number))

        this.messageService.getMessagesForTopic(RemoteMessageTopics.STOP_MANUALLY)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(() => this.stopManually())

        this.messageService.getMessagesForTopic(RemoteMessageTopics.OFFSET_MANUALLY)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(payload => this.offsetCurrentHeading(payload as number))

        this.messageService.getMessagesForTopic(RemoteMessageTopics.NAVIGATE_ROUTE)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(route => this.pathReceived(route as LatLon[]))

        this.messageService.getMessagesForTopic(RemoteMessageTopics.REQUEST_UPDATE)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(() => this.broadcastState())
      }
    })

    this.controllerPath.pathSubscription
      .subscribe(() => {
        this.broadcastState()
      });

    this.deviceSelectionService.motorController.connected
      .pipe(distinctUntilChanged())
      .subscribe(() => this.broadcastState());

    timer(1000, 10 * 1000)
      .subscribe(() => this.broadcastState())
  }


  private broadcastState(): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      let message: StatsBroadcast = {
        displayStats: this.displayStatsService.currentStats(),
        currentPosition: this.deviceSelectionService.gpsSensor.locationData.value,
        path: this.controllerPath.pathSubscription.value,
      }

      void this.messageService.sendMessage(RemoteMessageTopics.BROADCAST_STATE, instanceToPlain(message))
    }
  }


  private maintainHeading(): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.manualControlService.maintainCurrentHeadingLocal();
      this.broadcastState();
    }
  }


  private moveManually(level: number): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.manualControlService.moveManuallyLocal(level);
      this.broadcastState();
    }
  }


  private stopManually(): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.manualControlService.stopManuallyLocal();
      this.broadcastState();
    }
  }


  private offsetCurrentHeading(offset: number): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.manualControlService.offsetCurrentHeading(offset);
      this.broadcastState();
    }
  }


  private pathReceived(route: LatLon[]): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.controllerPath.enabled = route.length > 0;
      this.controllerPath.command(route);
    }
  }

}

export class RemoteMessageTopics {
  static readonly MAINTAIN_CURRENT_HEADING = "MAINTAIN_CURRENT_HEADING";
  static readonly MOVE_MANUALLY = "MOVE_MANUALLY";
  static readonly STOP_MANUALLY = "STOP_MANUALLY";
  static readonly OFFSET_MANUALLY = "OFFSET_MANUALLY";
  static readonly NAVIGATE_ROUTE = "NAVIGATE_ROUTE";
  static readonly REQUEST_UPDATE = "REQUEST_UPDATE";
  static readonly BROADCAST_STATE = "BROADCAST_STATE";
}