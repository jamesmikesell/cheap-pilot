import { Component } from '@angular/core';
import { ReceiverService } from './remote/receiver-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(
    public receiver: ReceiverService,
  ) {
    console.log("receiver registered", !!receiver)
  }

}

