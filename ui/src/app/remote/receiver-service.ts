import { Injectable } from "@angular/core";
import { instanceToPlain } from "class-transformer";
import { distinctUntilChanged, map, skip, takeUntil, timer } from "rxjs";
import { ConfigService, RemoteReceiverMode } from "../service/config.service";
import { ControllerOrientationService } from "../service/controller-orientation.service";
import { ControllerPathService } from "../service/controller-path.service";
import { ControllerRotationRateService } from "../service/controller-rotation-rate.service";
import { DataLogService } from "../service/data-log.service";
import { DeviceSelectService } from "../service/device-select.service";
import { DisplayStatsService } from "../service/display-stats.service";
import { LatLon } from "../utils/coordinate-utils";
import { PathUpdate, StatsBroadcast } from "./message-dtos";
import { MessagingService } from "./messaging-service";

@Injectable({
  providedIn: 'root'
})
export class ReceiverService {

  constructor(
    private configService: ConfigService,
    private messageService: MessagingService,
    private controllerOrientation: ControllerOrientationService,
    private dataLog: DataLogService,
    private controllerRotationRate: ControllerRotationRateService,
    private controllerPath: ControllerPathService,
    private displayStatsService: DisplayStatsService,
    private deviceSelectionService: DeviceSelectService,
  ) {

    let isReceiverModeChanges = interval(500)
      .pipe(map(() => this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER))
      .pipe(distinctUntilChanged())

    isReceiverModeChanges.subscribe(inReceiverMode => {
      if (inReceiverMode) {
        this.messageService.getMessagesForTopic(RemoteMessageTopics.MAINTAIN_CURRENT_HEADING)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(payload => this.maintainHeading(payload))

        this.messageService.getMessagesForTopic(RemoteMessageTopics.MOVE_MANUALLY)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(payload => this.moveManually(payload))

        this.messageService.getMessagesForTopic(RemoteMessageTopics.STOP_MANUALLY)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(() => this.stopManually())

        this.messageService.getMessagesForTopic(RemoteMessageTopics.NAVIGATE_ROUTE)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(route => this.pathReceived(route))

        this.messageService.getMessagesForTopic(RemoteMessageTopics.REQUEST_UPDATE)
          .pipe(takeUntil(isReceiverModeChanges.pipe(skip(1))))
          .subscribe(() => this.broadcastPathUpdate())
      }
    })

    this.controllerPath.pathSubscription
      .subscribe(() => {
        this.broadcastPathUpdate()
        this.broadcastStats()
      });

    this.deviceSelectionService.motorController.connected
      .pipe(distinctUntilChanged())
      .subscribe(() => this.broadcastStats());

    timer(1000, 10 * 1000)
      .subscribe(() => this.broadcastStats())
  }


  private broadcastStats(): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      let message: StatsBroadcast = {
        displayStats: this.displayStatsService.currentStats(),
        currentPosition: this.deviceSelectionService.gpsSensor.locationData.value,
      }

      this.messageService.sendMessage(RemoteMessageTopics.BROADCAST_STATS, instanceToPlain(message))
    }
  }


  private maintainHeading(_payload: string): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.controllerPath.stop();

      this.controllerOrientation.enabled = true;
      this.controllerOrientation.maintainCurrentHeading();
      this.dataLog.clearLogData();
    }
  }


  private moveManually(level: number): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.controllerPath.stop();

      if (this.controllerOrientation.enabled) {
        this.controllerOrientation.command((this.controllerOrientation.desired - (level * 5)) % 360);
      } else {
        this.controllerRotationRate.enabled = true;
        this.controllerRotationRate.command(this.controllerRotationRate.desired + level);
      }
    }
  }


  private stopManually(): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.controllerPath.stop();

      this.controllerRotationRate.cancelPidTune();
      this.controllerOrientation.cancelPidTune();

      if (this.controllerOrientation.enabled)
        this.controllerOrientation.enabled = false;

      if (this.controllerRotationRate.enabled && this.controllerRotationRate.desired === 0)
        this.controllerRotationRate.enabled = false;

      this.controllerRotationRate.command(0)
    }
  }


  private pathReceived(route: LatLon[]): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.controllerPath.enabled = route.length > 0;
      this.controllerPath.command(route);
    }
  }


  private broadcastPathUpdate(): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      let message: PathUpdate = {
        path: this.controllerPath.pathSubscription.value,
      }

      this.messageService.sendMessage(RemoteMessageTopics.BROADCAST_PATH_UPDATE, instanceToPlain(message))
    }
  }

}

export class RemoteMessageTopics {
  static readonly MAINTAIN_CURRENT_HEADING = "MAINTAIN_CURRENT_HEADING";
  static readonly MOVE_MANUALLY = "MOVE_MANUALLY";
  static readonly STOP_MANUALLY = "STOP_MANUALLY";
  static readonly NAVIGATE_ROUTE = "NAVIGATE_ROUTE";
  static readonly REQUEST_UPDATE = "REQUEST_UPDATE";
  static readonly BROADCAST_PATH_UPDATE = "BROADCAST_PATH_UPDATE";
  static readonly BROADCAST_STATS = "BROADCAST_STATS";
}