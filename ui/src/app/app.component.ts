import { Component } from '@angular/core';
import { AppVersion } from './app-version';
import { ReceiverService } from './remote/receiver-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  AppVersion = AppVersion;

  constructor(
    public receiver: ReceiverService,
  ) {
    console.log("receiver registered", !!receiver)
  }

}

