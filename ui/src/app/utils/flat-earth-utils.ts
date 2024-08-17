import { CoordinateUtils, LatLon } from "./coordinate-utils";

export class FlatEarthUtils {

  static calculateLocation(location: LatLon, bearingDegrees: number, distance: number): LatLon {
    const radians = CoordinateUtils.toRadians(bearingDegrees)
    const x = location.longitude + distance * Math.sin(radians);
    const y = location.latitude + distance * Math.cos(radians);
    return { latitude: y, longitude: x };
  }

}