import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { LatLngTuple } from 'leaflet';
import { filter } from 'rxjs';
import { ConfigService } from 'src/app/service/config.service';
import { ControllerPathService } from 'src/app/service/controller-path.service';
import { CoordinateUtils, LatLon } from 'src/app/service/coordinate-utils';
import { DeviceSelectService } from 'src/app/service/device-select.service';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  map: L.Map;

  private pathPoints: LatLngTuple[] = [];


  constructor(
    private deviceSelectionService: DeviceSelectService,
    private configService: ConfigService,
    private controllerPath: ControllerPathService,
  ) { }


  ngOnInit(): void {
    this.map = L.map('map').setView([0, 0], 0)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    if (this.configService.config.simulation)
      this.configureSimulatorPositions();

    let historyPath = L.polyline([], { color: 'red' }).addTo(this.map);
    this.deviceSelectionService.gpsSensor.locationData
      .pipe(filter(locationData => !!locationData))
      .subscribe(location => {
        let loc: LatLngTuple = [location.coords.latitude, location.coords.longitude];

        let distanceSinceLast: number
        if (this.pathPoints.length > 0) {
          let lastLocation = this.pathPoints[this.pathPoints.length - 1];
          distanceSinceLast = CoordinateUtils.distanceBetweenPointsInMeters(location.coords, { latitude: lastLocation[0], longitude: lastLocation[1] })
        }

        // if this is the first location event, move map to that area
        if (distanceSinceLast === undefined)
          this.map.setView(loc, 16)

        if (distanceSinceLast === undefined || distanceSinceLast > 3)
          this.pathPoints.push(loc);

        historyPath.setLatLngs(this.pathPoints);
      })
  }


  private configureSimulatorPositions(): void {
    let path: LatLon[] = [];
    path.push({ latitude: 40.001457, longitude: -80.001989 })
    path.push({ latitude: 39.999047, longitude: -80.002321 })

    for (let i = 0; i < path.length; i++) {
      const item = path[i];
      L.marker([item.latitude, item.longitude]).addTo(this.map).bindPopup((i + 1).toString());
    }

    setTimeout(() => {
      this.controllerPath.enabled = true;
      this.controllerPath.command(path);
    }, 0);
  }

}
