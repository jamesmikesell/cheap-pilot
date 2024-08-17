import * as mathjs from 'mathjs';
import { NumberProvider, ProviderConverter } from '../types/providers';
import { CoordinateUtils, LatLon } from './coordinate-utils';
import { FlatEarthUtils } from './flat-earth-utils';

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
      console.log(`GPS accuracy ${locationData.coords.accuracy.toFixed(1)} is above ${this.minimumRequiredAccuracyMeters} meters, ignoring location`);
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


  getHeadingFromHistoryPredictingTurningRate(): number {
    if (this.locationHistory.length < 2)
      return undefined;

    try {
      let history = [...this.locationHistory]
      let polyHeading = LocationHistoryTracker.getHeadingPolyFit(history);
      return polyHeading;
    } catch (error) {
      console.error("couldn't get heading using Polynomials, using avg heading history", error)
      return this.getHeadingFromHistory();
    }
  }


  static getHeadingPolyFit(history: LatLon[]): number {
    let headingCrossesVertical = false;
    let startsHeadingEast = history[1].longitude > history[0].longitude
    let xyLocations: LatLon[] = [{ latitude: 0, longitude: 0 }]
    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const past = history[i - 1];

      let stillHeadingEast = current.longitude > past.longitude
      if (stillHeadingEast !== startsHeadingEast)
        headingCrossesVertical = true;

      let pastFlatEarthLocation = xyLocations[i - 1];

      let distance = CoordinateUtils.distanceBetweenPointsInMeters(past, current);
      let bearing = CoordinateUtils.calculateBearing(past, current)
      let newFlatEarthLocation = FlatEarthUtils.calculateLocation(pastFlatEarthLocation, bearing, distance)
      xyLocations.push(newFlatEarthLocation);
    }

    if (headingCrossesVertical) {
      xyLocations.forEach(single => {
        let oldLat = single.latitude;
        single.latitude = single.longitude
        single.longitude = oldLat
      })
    }

    let xSet = xyLocations
      .map(single => single.longitude)
      .map(x => [1, x, x ** 2])

    let ySet = xyLocations
      .map(single => single.latitude)

    // The following finds a polynomial function that best fits the location history, and returns the coefficients
    // Calculate the coefficients: (X^T * X)^-1 * X^T * y
    const XMatrix = mathjs.matrix(xSet);
    const yVector = mathjs.matrix(ySet);
    const XT = mathjs.transpose(XMatrix);
    const XTX = mathjs.multiply(XT, XMatrix);
    const XTXInv = mathjs.inv(XTX);
    const XTy = mathjs.multiply(XT, yVector);
    const coefficients = mathjs.multiply(XTXInv, XTy);

    let numbers = coefficients.toArray() as number[];
    // line slope at a given location is the first derivative of the polynomial function
    let headingSlope = numbers[1]
      + (2 * numbers[2] * xyLocations[xyLocations.length - 1].longitude)
    let headingRadians = Math.atan(headingSlope);
    let headingDegrees = CoordinateUtils.toDegrees(headingRadians)

    let endsHeadingEast = xyLocations[xyLocations.length - 1].longitude > xyLocations[xyLocations.length - 2].longitude
    let headingAdjusted: number;
    if (headingCrossesVertical) {
      console.log("heading unadjusted", endsHeadingEast)
      if (endsHeadingEast)
        headingAdjusted = CoordinateUtils.normalizeHeading(headingDegrees)
      else
        headingAdjusted = CoordinateUtils.normalizeHeading(180 + headingDegrees)
    } else {
      if (endsHeadingEast)
        headingAdjusted = CoordinateUtils.normalizeHeading(90 - headingDegrees)
      else
        headingAdjusted = CoordinateUtils.normalizeHeading(270 - headingDegrees)

    }

    return headingAdjusted;
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
