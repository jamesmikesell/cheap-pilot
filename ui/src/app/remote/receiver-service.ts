import { Injectable } from "@angular/core";
import { ConfigService, RemoteReceiverMode } from "../service/config.service";
import { MessagingService } from "./messaging-service";
import { ControllerOrientationService } from "../service/controller-orientation.service";
import { DataLogService } from "../service/data-log.service";
import { ControllerRotationRateService } from "../service/controller-rotation-rate.service";

@Injectable({
  providedIn: 'root'
})
export class ReceiverService {


  constructor(
    private configService: ConfigService,
    private messageService: MessagingService,
    private controllerOrientation: ControllerOrientationService,
    private dataLog: DataLogService,
    public controllerRotationRate: ControllerRotationRateService,

  ) {
    this.messageService.addMessageHandler(RemoteMessageTopics.MAINTAIN_CURRENT_HEADING, payload => this.maintainHeading(payload))
    this.messageService.addMessageHandler(RemoteMessageTopics.MOVE_MANUALLY, payload => this.moveManually(payload))
    this.messageService.addMessageHandler(RemoteMessageTopics.STOP_MANUALLY, () => this.stopManually())
  }


  private maintainHeading(_payload: string): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      this.controllerOrientation.enabled = true;
      this.controllerOrientation.maintainCurrentHeading();
      this.dataLog.clearLogData();
    }
  }


  private moveManually(level: number): void {
    if (this.controllerOrientation.enabled) {
      this.controllerOrientation.command((this.controllerOrientation.desired - (level * 5)) % 360);
    } else {
      this.controllerRotationRate.enabled = true;
      this.controllerRotationRate.command(this.controllerRotationRate.desired + level);
    }
  }


  private stopManually(): void {
    this.controllerRotationRate.cancelPidTune();
    this.controllerOrientation.cancelPidTune();

    if (this.controllerOrientation.enabled)
      this.controllerOrientation.enabled = false;

    this.controllerRotationRate.command(0)
  }


}

export class RemoteMessageTopics {
  static readonly MAINTAIN_CURRENT_HEADING = "MAINTAIN_CURRENT_HEADING";
  static readonly MOVE_MANUALLY = "MOVE_MANUALLY";
  static readonly STOP_MANUALLY = "STOP_MANUALLY";

}