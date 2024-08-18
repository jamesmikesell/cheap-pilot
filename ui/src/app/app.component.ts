import { Component, HostBinding, OnDestroy } from '@angular/core';
import { ReceiverService } from './remote/receiver-service';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Subject, takeUntil } from 'rxjs';
import { ThemeService } from './service/theme-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {

  @HostBinding('class') componentCssClass: any;

  private destroy = new Subject<void>();


  constructor(
    public receiver: ReceiverService,
    public themeService: ThemeService,
    public overlayContainer: OverlayContainer,
  ) {
    console.log("receiver registered", !!receiver)

    this.themeService.themeSubscription
      .pipe(takeUntil(this.destroy))
      .subscribe(theme => {
        this.setTheme(theme.theme.styleClass);
      });
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