import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConfigService } from './config.service';
import { LocationData, LocationHistoryTracker } from '../utils/location-history-calculator';
import { GpsFilter } from './gps-filter';

@Injectable({
  providedIn: 'root'
})
export class SensorGpsService implements GpsSensor {

  locationData = new BehaviorSubject<GpsSensorData>(undefined);


  private locationTracker;
  private gpsFilter: GpsFilter;


  constructor(
    configService: ConfigService,
  ) {
    navigator.geolocation.watchPosition((data) => this.locationChange(data), null, { enableHighAccuracy: true });
    this.locationTracker = new LocationHistoryTracker({ getNumber: () => configService.config.minimumRequiredGpsAccuracyMeters })

    this.gpsFilter = new GpsFilter({ getNumber: () => configService.config.minimumRequiredGpsAccuracyMeters });
  }


  private locationChange(locationData: GeolocationPosition): void {
    this.locationTracker.tryAddLocationToHistory(locationData);

    let locationRaw: LocationData = {
      coords: {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        accuracy: locationData.coords.accuracy,
      },
      timestamp: locationData.timestamp,
    };

    let locationFiltered = this.gpsFilter.process(locationRaw)
    this.locationData.next(locationFiltered)
  }


}


export interface GpsSensor {
  locationData: BehaviorSubject<GpsSensorData>;
}


export interface GpsSensorData extends LocationData {
  speedMps: number;
  heading: number;
}
