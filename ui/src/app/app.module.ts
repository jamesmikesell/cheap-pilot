import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { NgChartsModule } from 'ng2-charts';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BlackoutComponent } from './component/blackout/blackout.component';
import { ChartComponent } from './component/chart/chart.component';
import { ConfigComponent } from './component/config/config.component';
import { DisplayStatsDeviceSensorsComponent } from './component/display-stats-device-sensors/display-stats-device-sensors.component';
import { DisplayStatsRemoteComponent } from './component/display-stats-remote/display-stats-remote.component';
import { DisplayStatsComponent } from './component/display-stats/display-stats.component';
import { FullScreenMapComponent } from './component/full-screen-map/full-screen-map.component';
import { MapComponent } from './component/map/map.component';
import { NavBarComponent } from './component/nav-bar/nav-bar.component';
import { RemoteControlComponent } from './component/remote-control/remote-control.component';
import { TestComponent } from './component/test/test.component';


@NgModule({
  declarations: [
    AppComponent,
    TestComponent,
    ChartComponent,
    ConfigComponent,
    BlackoutComponent,
    MapComponent,
    RemoteControlComponent,
    NavBarComponent,
    DisplayStatsComponent,
    FullScreenMapComponent,
    DisplayStatsDeviceSensorsComponent,
    DisplayStatsRemoteComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatSlideToggleModule,
    NgChartsModule,
    MatSnackBarModule,
    MatCardModule,
    MatExpansionModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerImmediately',
    }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

