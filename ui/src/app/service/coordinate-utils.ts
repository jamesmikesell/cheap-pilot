
export class CoordinateUtils {

  private static readonly EARTH_RADIUS_METERS = 6371e3;

  /** Calculate how far away the current location is from an imaginary line/circle drawn around the earth 
   * that goes through the starting point at the specified heading */
  static distanceFromLineMeters(
    start: LatLon,
    headingDegrees: number,
    current: LatLon,
  ): number {
    const latitudeStartRad = CoordinateUtils.toRadians(start.latitude);
    const longitudeStartRad = CoordinateUtils.toRadians(start.longitude);
    const latitudeCurrentRad = CoordinateUtils.toRadians(current.latitude);
    const longitudeCurrentRad = CoordinateUtils.toRadians(current.longitude);
    const headingRad = CoordinateUtils.toRadians(headingDegrees);

    // Calculate great circle bearing between starting point and current point
    const deltaLongitude = longitudeCurrentRad - longitudeStartRad;
    const y = Math.sin(deltaLongitude) * Math.cos(latitudeCurrentRad);
    const x =
      Math.cos(latitudeStartRad) * Math.sin(latitudeCurrentRad) -
      Math.sin(latitudeStartRad) * Math.cos(latitudeCurrentRad) * Math.cos(deltaLongitude);
    const greatCircleBearing = Math.atan2(y, x);

    // Calculate difference in bearings
    const bearingDifference = headingRad - greatCircleBearing;

    // Calculate distance between starting point and current point
    const deltaLatitude = latitudeCurrentRad - latitudeStartRad;
    const a =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(latitudeStartRad) *
      Math.cos(latitudeCurrentRad) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = CoordinateUtils.EARTH_RADIUS_METERS * c;

    // Calculate perpendicular distance from the line to the current point
    const perpendicularDistance = distance * Math.sin(bearingDifference);
    return perpendicularDistance;
  }


  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }


  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }


  static calculateNewPosition(start: LatLon, distanceMeters: number, angleDegrees: number): LatLon {
    const angularDistance = distanceMeters / CoordinateUtils.EARTH_RADIUS_METERS;
    const bearing = this.toRadians(angleDegrees);

    const lat1 = this.toRadians(start.latitude);
    const lon1 = this.toRadians(start.longitude);

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing));

    const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));

    return {
      latitude: this.toDegrees(lat2),
      longitude: this.toDegrees(lon2)
    };
  }


  static distanceBetweenPointsInMeters(location1: LatLon, location2: LatLon) {
    const lat1 = this.toRadians(location1.latitude);
    const lon1 = this.toRadians(location1.longitude);
    const lat2 = this.toRadians(location2.latitude);
    const lon2 = this.toRadians(location2.longitude);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = CoordinateUtils.EARTH_RADIUS_METERS * c;
    return distance;
  }


  static calculateBearing(start: LatLon, end: LatLon): number {
    const lat1Rad = this.toRadians(start.latitude);
    const lat2Rad = this.toRadians(end.latitude);
    const deltaLonRad = this.toRadians(end.longitude - start.longitude);

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    let bearing = this.toDegrees(Math.atan2(y, x));

    return this.normalizeHeading(bearing);
  }


  static normalizeHeading(heading: number): number {
    return (heading + 360) % 360
  }


  static circularMean(degrees: number[]): number {
    const radians = degrees.map((degree) => degree * (Math.PI / 180));

    // Calculate the sum of sin and cos values
    const sinSum = radians.reduce((sum, rad) => sum + Math.sin(rad), 0);
    const cosSum = radians.reduce((sum, rad) => sum + Math.cos(rad), 0);

    // Calculate the circular mean using arctan2
    const meanRad = Math.atan2(sinSum, cosSum);

    const meanDegrees = (meanRad * 180 / Math.PI) % 360;
    return meanDegrees;
  }

}


export interface LatLon {
  latitude: number;
  longitude: number;
}