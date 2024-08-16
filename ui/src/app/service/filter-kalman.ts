import { LatLon } from "../utils/coordinate-utils";

/** Copied from <https://stackoverflow.com/a/15657798/4327279> */
export class KalmanLocationFilter {
  location: LatLon;
  timestampMs: number;
  get accuracy(): number { return Math.sqrt(this.variance); }

  private readonly minAccuracy = 1;
  private variance: number; // P matrix.  Negative means object uninitialized.  NB: units irrelevant, as long as same units used throughout

  /**
   * 
   * @param qMps The code has a single free parameter Q, expressed in metres per second, 
   * which describes how quickly the accuracy decays in the absence of any new location
   * estimates. A higher Q parameter means that the accuracy decays faster. Kalman filters 
   * generally work better when the accuracy decays a bit quicker than one might expect, 
   * so for walking around with an Android phone I find that Q=3 metres per second works 
   * fine, even though I generally walk slower than that. But if travelling in a fast car
   *  a much larger number should obviously be used.
   */
  constructor(public qMps: number) {
    this.variance = -1;
  }


  /**
   * Kalman filter processing for latitude and longitude.
   *
   * @param {number} location - New measurement of location.
   * @param {number} accuracy - Measurement of 1 standard deviation error in meters.
   * @param {number} timestampMs - Time of measurement.
   * @returns {void}
   */
  process(location: LatLon, accuracy: number, timestampMs: number): void {
    if (accuracy < this.minAccuracy) accuracy = this.minAccuracy;

    if (!this.location) {
      this.timestampMs = timestampMs;
      this.location = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      this.variance = accuracy * accuracy;
    } else {
      const timeIncMilliseconds = timestampMs - this.timestampMs;
      if (timeIncMilliseconds > 0) {
        // time has moved on, so the uncertainty in the current position increases
        this.variance += timeIncMilliseconds * this.qMps * this.qMps / 1000;
        this.timestampMs = timestampMs;
        // TO DO: USE VELOCITY INFORMATION HERE TO GET A BETTER ESTIMATE OF CURRENT POSITION
      }

      // Kalman gain matrix K = Covariance * Inverse(Covariance + MeasurementVariance)
      // NB: because K is dimensionless, it doesn't matter that variance has different units to lat and lng
      const K = this.variance / (this.variance + accuracy * accuracy);
      // apply K
      let prevLocation = this.location;
      this.location = {
        latitude: prevLocation.latitude + K * (location.latitude - prevLocation.latitude),
        longitude: prevLocation.longitude + K * (location.longitude - prevLocation.longitude)
      }
      // new Covariance  matrix is (IdentityMatrix - K) * Covariance 
      this.variance = (1 - K) * this.variance;
    }
  }
}
