import { NumberProvider, ProviderConverter } from '../types/providers';
import { CoordinateUtils } from './coordinate-utils';

export class LocationHistoryTracker {

  private locationHistory: LocationHistory[] = [];
  private lastLocation: LocationHistory;
  minimumRequiredAccuracyMeters: NumberProvider;


  constructor(
    minimumRequiredAccuracyMeters: number | NumberProvider,
    private maxHistoriesToKeep = 3,
  ) {
    this.minimumRequiredAccuracyMeters = ProviderConverter.ensureNumberProvider(minimumRequiredAccuracyMeters);
  }


  tryAddLocationToHistory(locationData: LocationData | GeolocationPosition) {
    if (locationData.coords.accuracy > this.minimumRequiredAccuracyMeters.getNumber()) {
      console.log(`GPS accuracy ${locationData.coords.accuracy.toFixed(1)} is above ${this.minimumRequiredAccuracyMeters.getNumber()} meters, ignoring location`);
      return;
    }

    let currentLocation = new LocationHistory(locationData.coords.latitude,
      locationData.coords.longitude,
      new Date(locationData.timestamp)
    )

    if (this.locationHistory.length > 0) {
      this.lastLocation = currentLocation;
      let currentLocationIsCloseToHistory = this.locationHistory
        .map(single => CoordinateUtils.distanceBetweenPointsInMeters(single, currentLocation))
        .some(singleDistance => singleDistance < this.minimumRequiredAccuracyMeters.getNumber())

      if (currentLocationIsCloseToHistory)
        return;
    }

    // only keep the most recent location histories
    this.locationHistory = this.locationHistory.slice(-(this.maxHistoriesToKeep - 1))
    this.locationHistory.push(currentLocation);
  }


  getSpeedMpsFromHistory(): number {
    if (this.locationHistory.length === 0 || !this.lastLocation)
      return 0;

    let oldest = this.locationHistory[0];
    let newest = this.lastLocation;
    let distanceMeters = CoordinateUtils.distanceBetweenPointsInMeters(newest, oldest);

    let timeInMs = newest.time.getTime() - oldest.time.getTime();
    let speedMetersPerSec = distanceMeters / (timeInMs / 1000);
    return speedMetersPerSec;
  }


  getHeadingFromHistory(): number {
    if (this.locationHistory.length < 2 || !this.lastLocation)
      return undefined;

    let oldest = this.locationHistory[0];
    let newest = this.lastLocation;
    return CoordinateUtils.calculateBearing(oldest, newest);
  }

}


export class LocationHistory {
  constructor(
    public latitude: number,
    public longitude: number,
    public time: Date,
  ) { }
}


export interface LocationData {
  coords: {
    accuracy: number;
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}
