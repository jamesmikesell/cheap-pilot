import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocationData, LocationHistoryTracker } from './location-history-calculator';

@Injectable({
  providedIn: 'root'
})
export class SensorGpsService implements GpsSensor {

  locationData = new BehaviorSubject<GpsSensorData>(undefined);


  private speedTracker = new LocationHistoryTracker();


  constructor() {
    navigator.geolocation.watchPosition((data) => this.locationChange(data), null, { enableHighAccuracy: true });
  }


  private locationChange(locationData: GeolocationPosition): void {
    this.speedTracker.tryAddLocationToHistory(locationData);

    this.locationData.next({
      coords: {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        accuracy: locationData.coords.accuracy,
      },
      speedMps: this.speedTracker.getSpeedMpsFromHistory(),
      timestamp: locationData.timestamp,
      heading: locationData.coords.heading,
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
