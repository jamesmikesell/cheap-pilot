import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Subject, takeUntil } from 'rxjs';
import { AppVersion } from 'src/app/app-version';
import { ControllerBtMotorService } from 'src/app/service/controller-bt-motor.service';
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
    private btMotorController: ControllerBtMotorService,
    public navBarService: NavBarService,
  ) { }



  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }


  ngOnInit(): void {
    this.navBarService.drawerToggle
      .pipe(takeUntil(this.destroy))
      .subscribe(() => this.drawer.toggle())
  }


  @HostListener('window:beforeunload')
  onWindowReload(): void {
    this.btMotorController.disconnect();
  }


  invertMap(): void {
    if (!this.themeService.themeSubscription.value.theme.isDark)
      return;
    this.themeService.allowMapInversion = !this.themeService.allowMapInversion;
  }


  toggleFullScreen(): void {
    if (this.isInFullscreenMode())
      document.exitFullscreen();
    else
      document.documentElement.requestFullscreen();
  }


  isInFullscreenMode(): boolean {
    return !!document.fullscreenElement;
  }


}
