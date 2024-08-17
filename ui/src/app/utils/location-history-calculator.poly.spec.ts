
import { LatLon } from './coordinate-utils';
import { LocationHistoryTracker } from './location-history-calculator';

describe('Location History Poly Heading Calculator', () => {

  beforeEach(() => {
  });

  // //        ^
  // //     / / \
  // //      /
  // //     /
  // //    /

  // it('heading NE', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: 0.1, longitude: 0.1 },
  //     { latitude: 0.2, longitude: 0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(45);
  // });


  // it('heading NE turning N', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: 0.1, longitude: 0.1 },
  //     { latitude: 0.3, longitude: 0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(22);
  // });


  // it('heading NE turning E', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: 0.1, longitude: 0.1 },
  //     { latitude: 0.15, longitude: 0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(76);
  // });







  // //  \
  // //   \
  // //    \ 
  // //   \ \ /
  // //      v 

  // it('heading SE', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: -0.1, longitude: 0.1 },
  //     { latitude: -0.2, longitude: 0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(135);
  // });


  // it('heading SE turning N', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: -0.1, longitude: 0.1 },
  //     { latitude: -0.15, longitude: 0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(104);
  // });


  // it('heading SE turning S', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: -0.1, longitude: 0.1 },
  //     { latitude: -0.3, longitude: 0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(158);
  // });






  // //      /
  // //     /
  // //    /
  // // \ / /
  // //  v

  // it('heading SW', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: -0.1, longitude: -0.1 },
  //     { latitude: -0.2, longitude: -0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(225);
  // });


  // it('heading SW turning S', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: -0.1, longitude: -0.1 },
  //     { latitude: -0.3, longitude: -0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(202);
  // });


  // it('heading SW turning W', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: -0.1, longitude: -0.1 },
  //     { latitude: -0.15, longitude: -0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(256);
  // });





  // //  ^
  // // / \ \
  // //    \
  // //     \
  // //      \

  // it('heading NW', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: 0.1, longitude: -0.1 },
  //     { latitude: 0.2, longitude: -0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(315);
  // });


  // it('heading NW turning W', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: 0.1, longitude: -0.1 },
  //     { latitude: 0.15, longitude: -0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(284);
  // });


  // it('heading NW turning N', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: 0.1, longitude: -0.1 },
  //     { latitude: 0.3, longitude: -0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(338);
  // });



  // // ///////////////////////////////////////////////
  // // ///////////////////////////////////////////////
  // // ///////////////////////////////////////////////
  // // ///////////////////////////////////////////////
  // // ///////////////////////////////////////////////

  // it('Start NE end SE', () => {
  //   let history: LatLon[] = [
  //     { latitude: 0, longitude: 0 },
  //     { latitude: 0.1, longitude: 0.1 },
  //     { latitude: 0, longitude: 0.2 },
  //   ]

  //   let heading = LocationHistoryTracker.getHeadingPolyFit(history);
  //   expect(Math.round(heading)).toBe(153);
  // });


  // ///////////////////////////////////////////////
  // ///////////////////////////////////////////////
  // ///////////////////////////////////////////////
  // ///////////////////////////////////////////////
  // ///////////////////////////////////////////////

  it('Start NE end NW', () => {
    let history: LatLon[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.1, longitude: 0.1 },
      { latitude: 0.2, longitude: 0 },
    ]

    let heading = LocationHistoryTracker.getHeadingPolyFit(history);
    expect(Math.round(heading)).toBe(297);
  });

  it('Start NW end NE', () => {
    let history: LatLon[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.1, longitude: -0.1 },
      { latitude: 0.2, longitude: 0 },
    ]

    let heading = LocationHistoryTracker.getHeadingPolyFit(history);
    expect(Math.round(heading)).toBe(63);
  });

  it('Start SE end SW', () => {
    let history: LatLon[] = [
      { latitude: 0, longitude: 0 },
      { latitude: -0.1, longitude: 0.1 },
      { latitude: -0.2, longitude: 0 },
    ]

    let heading = LocationHistoryTracker.getHeadingPolyFit(history);
    expect(Math.round(heading)).toBe(243);
  });

  it('Start SW end SE', () => {
    let history: LatLon[] = [
      { latitude: 0, longitude: 0 },
      { latitude: -0.1, longitude: -0.1 },
      { latitude: -0.2, longitude: 0 },
    ]

    let heading = LocationHistoryTracker.getHeadingPolyFit(history);
    expect(Math.round(heading)).toBe(117);
  });

});

