import { Component, HostListener } from '@angular/core';
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


  @HostListener('document:visibilitychange', ['$event'])
  onVisibilityChange(_event: Event) {
    if (!document.hidden) {
      // This means the app regained focus / power back on etc
      this.messagingService.sendMessage(RemoteMessageTopics.REQUEST_UPDATE, "")
    }
  }


  maintainCurrentHeading(): void {
    this.messagingService.sendMessage(RemoteMessageTopics.MAINTAIN_CURRENT_HEADING, "")
    this.vibrate()
  }

  moveManually(level: number): void {
    this.messagingService.sendMessage(RemoteMessageTopics.MOVE_MANUALLY, level)
    this.vibrate()
  }

  stopManually(): void {
    this.messagingService.sendMessage(RemoteMessageTopics.STOP_MANUALLY, undefined)
    this.vibrate()
  }

  private vibrate(): void {
    navigator.vibrate([50]);
  }

}
