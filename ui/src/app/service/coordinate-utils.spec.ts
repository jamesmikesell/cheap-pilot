
import { CoordinateUtils, LatLon } from './coordinate-utils';

describe('SensorNavigationService', () => {

  const start: LatLon = { latitude: 41.890074, longitude: 12.492374 };
  const headingDegrees = 45;



  it('SE and close', () => {
    let current = { latitude: 41.893676, longitude: 12.498112 }

    expect(CoordinateUtils.distanceFromLineMeters(
      start,
      headingDegrees,
      current,
    )).toBeCloseTo(-53, 0);
  });


  it('NW and close', () => {
    let current = { latitude: 41.913454, longitude: 12.521008 }

    expect(CoordinateUtils.distanceFromLineMeters(
      start,
      headingDegrees,
      current,
    )).toBeCloseTo(163, 0);
  });


  it('SE and close', () => {
    let current = { latitude: 41.834777, longitude: 12.423430 }

    expect(CoordinateUtils.distanceFromLineMeters(
      start,
      headingDegrees,
      current,
    )).toBeCloseTo(-307, 0);
  });


  it('SE and far', () => {
    let current = { latitude: 41.826685, longitude: 12.594337 }

    expect(CoordinateUtils.distanceFromLineMeters(
      start,
      headingDegrees,
      current,
    )).toBeCloseTo(-10955, 0);
  });


  it('NW and far', () => {
    let current = { latitude: 41.942913, longitude: 12.458052 }

    expect(CoordinateUtils.distanceFromLineMeters(
      start,
      headingDegrees,
      current,
    )).toBeCloseTo(6162, 0);
  });



  it('calculate coordinate at distance and angle from location', () => {
    let start = {
      latitude: 40.1,
      longitude: 37.2,
    }

    let position2 = CoordinateUtils.calculateNewPosition(start, 1, 30);
    let distance = CoordinateUtils.distanceBetweenPointsInMeters(start, position2);

    expect(distance).toBeCloseTo(1, 5);
  });


});
