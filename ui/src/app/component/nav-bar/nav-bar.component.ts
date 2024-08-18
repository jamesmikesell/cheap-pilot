import { Component } from '@angular/core';
import { AppVersion } from 'src/app/app-version';
import { ThemeService } from 'src/app/service/theme-service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent {

  AppVersion = AppVersion;

  constructor(
    public themeService: ThemeService,
  ) { }


  toggleTheme(): void {
    this.themeService.darkMode = !this.themeService.darkMode;
  }


  invertMap(): void {
    if (!this.themeService.darkMode)
      return;
    this.themeService.allowMapInversion = !this.themeService.allowMapInversion;
  }


}
