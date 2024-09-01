import { Component } from '@angular/core';
import { MessagingService } from 'src/app/remote/messaging-service';
import { RemoteMessageTopics } from 'src/app/remote/receiver-service';

@Component({
  selector: 'app-remote-control',
  templateUrl: './remote-control.component.html',
  styleUrls: ['./remote-control.component.scss']
})
export class RemoteControlComponent {


  constructor(
    private messagingService: MessagingService,
  ) { }


  maintainCurrentHeading(): void {
    void this.messagingService.sendMessage(RemoteMessageTopics.MAINTAIN_CURRENT_HEADING, "")
    this.vibrate()
  }

  moveManually(level: number): void {
    void this.messagingService.sendMessage(RemoteMessageTopics.MOVE_MANUALLY, level)
    this.vibrate()
  }

  stopManually(): void {
    void this.messagingService.sendMessage(RemoteMessageTopics.STOP_MANUALLY, undefined)
    this.vibrate()
  }

  private vibrate(): void {
    navigator.vibrate([50]);
  }

}
