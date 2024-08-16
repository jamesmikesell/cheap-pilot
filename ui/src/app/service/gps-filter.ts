import { NumberProvider } from "../types/providers";
import { LocationData, LocationHistoryTracker } from "../utils/location-history-calculator";
import { KalmanLocationFilter } from "./filter-kalman";
import { GpsSensorData } from "./sensor-gps.service";

export class GpsFilter {

  private filterLocation = new KalmanLocationFilter(3)
  private speedHeadingFilter: LocationHistoryTracker;


  constructor(speedTrackerMinAccuracy: number | NumberProvider) {
    this.speedHeadingFilter = new LocationHistoryTracker(speedTrackerMinAccuracy);
  }


  process(locationRaw: LocationData): GpsSensorData {
    this.filterLocation.process(locationRaw.coords, locationRaw.coords.accuracy, locationRaw.timestamp);
    let locationFiltered = this.filterLocation.location;

    let coordsFiltered = {
      accuracy: this.filterLocation.accuracy,
      latitude: locationFiltered.latitude,
      longitude: locationFiltered.longitude,
    }

    this.speedHeadingFilter.tryAddLocationToHistory({
      coords: coordsFiltered,
      timestamp: locationRaw.timestamp
    });

    this.filterLocation.qMps = this.speedHeadingFilter.getSpeedMpsFromHistory();

    let gpsDataNoisy: GpsSensorData = {
      coords: coordsFiltered,
      timestamp: locationRaw.timestamp,
      speedMps: this.speedHeadingFilter.getSpeedMpsFromHistory(),
      heading: this.speedHeadingFilter.getHeadingFromHistory(),
    };

    return gpsDataNoisy;
  }

}
