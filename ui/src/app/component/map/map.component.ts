import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-editable';
import 'leaflet.locatecontrol';
import { filter } from 'rxjs';
import { MessagingService } from 'src/app/remote/messaging-service';
import { ReceiverService, RemoteMessageTopics } from 'src/app/remote/receiver-service';
import { ConfigService, RemoteReceiverMode } from 'src/app/service/config.service';
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

  private pathPoints: L.LatLng[] = [];
  private pathDrawn: L.Polyline;
  private currentLocation: L.LatLng;
  private waypointCircles: L.Circle[] = [];


  constructor(
    private deviceSelectionService: DeviceSelectService,
    private configService: ConfigService,
    private controllerPath: ControllerPathService,
    private receiverService: ReceiverService,
    private messageService: MessagingService,
  ) { }


  ngOnInit(): void {
    this.controllerPath.pointReached.subscribe(() => this.deletePoint())

    this.receiverService.routeUpdated.subscribe(route => this.pathReceived(route))

    this.map = L.map('map', { editable: true, }).setView([0, 0], 0)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.addEditControls();
    this.addLocateControl();

    let historyPath = L.polyline([], { color: 'crimson' }).addTo(this.map);
    this.deviceSelectionService.gpsSensor.locationData
      .pipe(filter(locationData => !!locationData))
      .subscribe(location => {
        let distanceSinceLast: number
        if (this.pathPoints.length > 0) {
          let lastLocation = this.pathPoints[this.pathPoints.length - 1];
          distanceSinceLast = CoordinateUtils.distanceBetweenPointsInMeters(location.coords, { latitude: lastLocation.lat, longitude: lastLocation.lng })
        }

        // if this is the first location event, move map to that area
        this.currentLocation = new L.LatLng(location.coords.latitude, location.coords.longitude);
        if (distanceSinceLast === undefined)
          this.map.setView(this.currentLocation, 16)

        if (distanceSinceLast === undefined || distanceSinceLast > 3)
          this.pathPoints.push(this.currentLocation);

        historyPath.setLatLngs(this.pathPoints);
      })
  }


  private addEditControls() {
    let editControl = L.Control.extend({
      options: {
        position: 'topleft',
        callback: null,
        kind: '',
        html: ''
      },

      onAdd: function (map: { editTools: any; }) {
        let container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
          link = L.DomUtil.create('a', '', container);

        link.href = '#';
        link.title = 'Create a new ' + this.options.kind;
        link.innerHTML = this.options.html;
        L.DomEvent.on(link, 'click', L.DomEvent.stop)
          .on(link, 'click', () => {
            (window as any).LAYER = this.options.callback.call(map.editTools);
          }, this);

        return container;
      }
    });


    let newLineControl = editControl.extend({
      options: {
        position: 'topleft',
        callback: () => {
          if (this.pathDrawn) {
            this.map.removeLayer(this.pathDrawn)
            this.pathDrawn = undefined;
            this.drawnPathUpdated()
          } else {
            this.map.editTools.startPolyline(this.currentLocation, { color: "tomato", dashArray: '5, 15', dashOffset: '0' })
          }
        },
        kind: 'line',
        html: '\\/\\',
      }
    });


    this.map.on('editable:vertex:dragend', (_event) => this.drawnPathUpdated());
    this.map.on('editable:vertex:clicked', (_event) => this.drawnPathUpdated());


    this.map.on('editable:drawing:end', (event) => {
      this.pathDrawn = event.layer;
      this.drawnPathUpdated()
    });


    this.map.on('editable:drawing:start', _event => {
      let tooltip = L.tooltip({ direction: 'center' })
        .setContent("Click on map to set first route waypoint.<br>" +
          "Navigation will not start until route finalized.<br>" +
          "Click on last point to finalize route."
        )
        .setLatLng(this.map.getCenter())
        .addTo(this.map);

      setTimeout(() => {
        this.map.removeLayer(tooltip);
      }, 12000);
    });

    this.map.addControl(new newLineControl());
  }


  private addLocateControl(): void {
    L.control.locate({
      showCompass: false
    }).addTo(this.map);
  }


  private clearCircles(): void {
    this.waypointCircles.forEach(single => this.map.removeLayer(single))
    this.waypointCircles.length = 0
  }


  private deletePoint(): void {
    if (this.pathDrawn) {
      let points = this.pathDrawn.getLatLngs();
      points.shift()
    }
    this.redrawPath()
  }


  private clearAndDrawPath(path: L.LatLng[]): void {
    if (this.pathDrawn)
      this.map.removeLayer(this.pathDrawn)

    this.pathDrawn = undefined;

    if (path && path.length > 1) {
      this.pathDrawn = L.polyline([]).addTo(this.map);
      this.pathDrawn.setLatLngs(path);
      this.pathDrawn.enableEdit();
      this.pathDrawn.setStyle({ color: "rgb(51, 136, 255)", dashArray: "5 15" })
    }
    this.redrawWaypointProximityCircles();
  }


  private redrawPath(): void {
    let points: L.LatLng[];
    if (this.pathDrawn)
      points = this.pathDrawn.getLatLngs() as L.LatLng[];

    this.clearAndDrawPath(points);
  }


  private redrawWaypointProximityCircles(): void {
    this.clearCircles();
    if (this.pathDrawn) {
      let mapCoordinates = (this.pathDrawn.getLatLngs() as L.LatLng[]);
      mapCoordinates
        .slice(1)
        .forEach(single => {
          let circle = L.circle(single, {
            color: 'red',
            fillColor: '#f03',
            weight: 1,
            fillOpacity: 0.4,
            radius: this.configService.config.waypointProximityMeters,
          }).addTo(this.map);

          this.waypointCircles.push(circle)
        })
    }
  }


  private drawnPathUpdated(): void {
    this.redrawPath()
    let navCoordinates: LatLon[] = [];
    if (this.pathDrawn) {
      let mapCoordinates = (this.pathDrawn.getLatLngs() as L.LatLng[]);
      navCoordinates = mapCoordinates
        .slice(1)
        .map((single): LatLon => ({ latitude: single.lat, longitude: single.lng }))
    }

    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE) {
      if (this.pathDrawn) {
        let mapCoordinates = (this.pathDrawn.getLatLngs() as L.LatLng[]);
        let uiCoordinates = mapCoordinates
          .map((single): LatLon => ({ latitude: single.lat, longitude: single.lng }))
        this.messageService.sendMessage(RemoteMessageTopics.NAVIGATE_ROUTE, uiCoordinates);
      }
    }

    if (this.deviceSelectionService.motorController.connected.value) {
      setTimeout(() => {
        this.controllerPath.enabled = navCoordinates.length > 0;
        this.controllerPath.command(navCoordinates);
      }, 0);
    }
  }


  pathReceived(route: LatLon[]): void {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.RECEIVER) {
      let uiPath = route.map(single => new L.LatLng(single.latitude, single.longitude))
      this.clearAndDrawPath(uiPath);
      this.drawnPathUpdated();
    }
  }


}
