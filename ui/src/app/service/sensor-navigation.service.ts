import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SensorNavigationService {

  constructor() { }


  calculateDistanceFromLine(
    latitudeStart: number,
    longitudeStart: number,
    headingDegrees: number,
    latitudeCurrent: number,
    longitudeCurrent: number
  ): number {
    // Convert degrees to radians
    const latitudeStartRad = SensorNavigationService.toRadians(latitudeStart);
    const longitudeStartRad = SensorNavigationService.toRadians(longitudeStart);
    const latitudeCurrentRad = SensorNavigationService.toRadians(latitudeCurrent);
    const longitudeCurrentRad = SensorNavigationService.toRadians(longitudeCurrent);
    const headingRad = SensorNavigationService.toRadians(headingDegrees);

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
    const earthRadius = 6371; // Earth's radius in kilometers
    const deltaLatitude = latitudeCurrentRad - latitudeStartRad;
    const a =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(latitudeStartRad) *
      Math.cos(latitudeCurrentRad) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    // Calculate perpendicular distance from the line to the current point
    const perpendicularDistance = distance * Math.sin(bearingDifference);

    return perpendicularDistance; // Distance in kilometers
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }



  static haversineDistanceInMeters(latitude1: number, longitude1: number, latitude2: number, longitude2: number) {
    const lat1 = this.toRadians(latitude1);
    const lon1 = this.toRadians(longitude1);
    const lat2 = this.toRadians(latitude2);
    const lon2 = this.toRadians(longitude2);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const R = 6371000; // Radius of the Earth in meters
    const distance = R * c;
    return distance;
  }

}
