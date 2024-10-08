import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ReceiverService } from './remote/receiver-service';
import { AudioService } from './service/audio.service';
import { ThemeService } from './service/theme-service';
import { WakeLockService } from './service/wake-lock.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy, OnInit {

  @HostBinding('class') componentCssClass: any;

  private destroy = new Subject<void>();


  constructor(
    public receiver: ReceiverService,
    public themeService: ThemeService,
    public overlayContainer: OverlayContainer,
    private wakeLockService: WakeLockService,
    audioService: AudioService,
  ) {
    console.log("receiver registered", !!receiver)
    console.log("audioService registered", !!audioService)

    this.themeService.themeSubscription
      .pipe(takeUntil(this.destroy))
      .subscribe(theme => {
        this.setTheme(theme.theme.styleClass);
      });
  }


  ngOnInit(): void {
    this.wakeLockService.wakeLock();
  }


  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  private setTheme(theme: string): void {
    if (theme)
      this.overlayContainer.getContainerElement().classList.add(theme);
    this.componentCssClass = theme;
  }
}