import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Subject, takeUntil } from 'rxjs';
import { AppVersion } from 'src/app/app-version';
import { NavBarService } from 'src/app/service/nav-bar.service';
import { AppThemeNames, ThemeService } from 'src/app/service/theme-service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent implements OnInit, OnDestroy {

  @ViewChild("drawer") drawer: MatSidenav;

  AppVersion = AppVersion;
  AppThemeNames = AppThemeNames;
  blackoutScreen = false;


  private destroy = new Subject<void>();


  constructor(
    public themeService: ThemeService,
    public navBarService: NavBarService,
  ) { }



  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }


  ngOnInit(): void {
    this.navBarService.drawerToggle
      .pipe(takeUntil(this.destroy))
      .subscribe(() => void this.drawer.toggle())
  }


  invertMap(): void {
    if (!this.themeService.themeSubscription.value.theme.isDark)
      return;
    this.themeService.allowMapInversion = !this.themeService.allowMapInversion;
  }


  toggleFullScreen(): void {
    if (this.isInFullscreenMode())
      void document.exitFullscreen();
    else
      void document.documentElement.requestFullscreen();
  }


  isInFullscreenMode(): boolean {
    return !!document.fullscreenElement;
  }


}
