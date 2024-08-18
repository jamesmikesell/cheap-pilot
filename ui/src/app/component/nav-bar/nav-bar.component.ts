import { Component } from '@angular/core';
import { AppVersion } from 'src/app/app-version';
import { AppThemeNames, ThemeService } from 'src/app/service/theme-service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent {

  AppVersion = AppVersion;
  AppThemeNames = AppThemeNames;

  constructor(
    public themeService: ThemeService,
  ) { }


  invertMap(): void {
    if (!this.themeService.themeSubscription.value.theme.isDark)
      return;
    this.themeService.allowMapInversion = !this.themeService.allowMapInversion;
  }


}
