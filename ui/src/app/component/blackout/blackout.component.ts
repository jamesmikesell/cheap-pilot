import { Component } from '@angular/core';
import { ThemeService } from 'src/app/service/theme-service';

@Component({
  selector: 'app-blackout',
  templateUrl: './blackout.component.html',
  styleUrls: ['./blackout.component.scss']
})
export class BlackoutComponent {

  constructor(
    public themeService: ThemeService,
  ) { }

}
