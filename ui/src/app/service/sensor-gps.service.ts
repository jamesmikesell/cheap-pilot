import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConfigService } from './config.service';
import { LocationData, LocationHistoryTracker } from './location-history-calculator';

@Injectable({
  providedIn: 'root'
})
export class SensorGpsService implements GpsSensor {

  locationData = new BehaviorSubject<GpsSensorData>(undefined);


  private locationTracker;


  constructor(
    configService: ConfigService,
  ) {
    navigator.geolocation.watchPosition((data) => this.locationChange(data), null, { enableHighAccuracy: true });
    this.locationTracker = new LocationHistoryTracker({ getNumber: () => configService.config.minimumRequiredGpsAccuracyMeters })
  }


  private locationChange(locationData: GeolocationPosition): void {
    this.locationTracker.tryAddLocationToHistory(locationData);

    this.locationData.next({
      coords: {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        accuracy: locationData.coords.accuracy,
      },
      speedMps: this.locationTracker.getSpeedMpsFromHistory(),
      timestamp: locationData.timestamp,
      heading: this.locationTracker.getHeadingFromHistory(),
    })
  }


}


export interface GpsSensor {
  locationData: BehaviorSubject<GpsSensorData>;
}


export interface GpsSensorData extends LocationData {
  speedMps: number;
  heading: number;
}
