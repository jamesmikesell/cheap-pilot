import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, merge, Subject, takeUntil } from 'rxjs';
import { MessagingService } from 'src/app/remote/messaging-service';
import { RemoteMessageTopics } from 'src/app/remote/receiver-service';
import { RemoteService } from 'src/app/remote/remote-service';
import { ConfigService, RemoteReceiverMode } from 'src/app/service/config.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { ManualControlService } from 'src/app/service/manual-control.service';
import { DialogSightHeadingLauncher } from '../dialog-sight-heading/dialog-sight-heading.component';

@Component({
  selector: 'app-manual-controls',
  templateUrl: './manual-controls.component.html',
  styleUrl: './manual-controls.component.scss'
})
export class ManualControlsComponent implements OnInit, OnDestroy {

  orientationControllerEnabled = false;
  deviceConnected = false;
  MoveDirection = MoveDirection;
  remoteMode = false;


  private destroy = new Subject<void>();


  constructor(
    private controllerOrientation: ControllerOrientationService,
    private deviceSelectService: DeviceSelectService,
    private configService: ConfigService,
    private remoteService: RemoteService,
    private messagingService: MessagingService,
    private manualControlService: ManualControlService,
    private sightHeadingDialog: DialogSightHeadingLauncher,
  ) {
  }


  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }


  ngOnInit(): void {
    merge(
      interval(100),
      this.deviceSelectService.motorController.connected,
      this.remoteService.stateBroadcastReceived
    ).pipe(takeUntil(this.destroy))
      .subscribe(() => {
        this.remoteMode = this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE
        if (this.remoteMode) {
          let lastState = this.remoteService.lastStateBroadcastReceived.value?.displayStats;
          this.deviceConnected = lastState?.bluetoothConnected;
          this.orientationControllerEnabled = lastState?.controllerOrientation;
        } else {
          this.orientationControllerEnabled = this.controllerOrientation.enabled;
          this.deviceConnected = this.deviceSelectService.motorController.connected.value;
        }
      })
  }


  maintainCurrentHeading(): void {
    this.vibrate();
    if (this.remoteMode)
      void this.messagingService.sendMessage(RemoteMessageTopics.MAINTAIN_CURRENT_HEADING, "")
    else
      this.manualControlService.maintainCurrentHeadingLocal();
  }


  moveManually(direction: MoveDirection): void {
    this.vibrate();
    switch (direction) {
      case MoveDirection.LEFT:
        if (this.remoteMode)
          void this.messagingService.sendMessage(RemoteMessageTopics.MOVE_MANUALLY, 1)
        else
          this.manualControlService.moveManuallyLocal(1);
        break;
      case MoveDirection.RIGHT:
        if (this.remoteMode)
          void this.messagingService.sendMessage(RemoteMessageTopics.MOVE_MANUALLY, -1)
        else
          this.manualControlService.moveManuallyLocal(-1);
        break;
      case MoveDirection.STOP:
        if (this.remoteMode)
          void this.messagingService.sendMessage(RemoteMessageTopics.STOP_MANUALLY, undefined)
        else
          this.manualControlService.stopManuallyLocal();
        break;
    }
  }


  async launchSightHeading(): Promise<void> {
    let headingOffset = await this.sightHeadingDialog.launch();
    if (headingOffset !== undefined) {
      void this.messagingService.sendMessage(RemoteMessageTopics.OFFSET_MANUALLY, headingOffset)
    }
  }


  private vibrate(): void {
    navigator.vibrate([50]);
  }
}


enum MoveDirection {
  LEFT,
  RIGHT,
  STOP,
}