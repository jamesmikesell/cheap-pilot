import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { plainToInstance } from 'class-transformer';
import * as L from 'leaflet';
import 'leaflet-editable';
import 'leaflet-providers';
import 'leaflet.locatecontrol';
import { filter } from 'rxjs';
import { Update } from 'src/app/remote/message-dtos';
import { MessagingService } from 'src/app/remote/messaging-service';
import { RemoteMessageTopics } from 'src/app/remote/receiver-service';
import { ConfigService, RemoteReceiverMode } from 'src/app/service/config.service';
import { ControllerPathService } from 'src/app/service/controller-path.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { PathHistoryDedupeService } from 'src/app/service/path-history-dedupe-service';
import { ThemeService } from 'src/app/service/theme-service';
import { CoordinateUtils, LatLon } from 'src/app/utils/coordinate-utils';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit, OnDestroy {

  @ViewChild("uxMap") uxMap: ElementRef<HTMLDivElement>;

  private map: L.Map;

  private pathPoints: L.LatLng[] = [];
  private pathDrawn: L.Polyline;
  private currentLocation: L.LatLng;
  private waypointCircles: L.Circle[] = [];
  private MAP_BASE_LAYER = "MAP_BASE_LAYER";
  private pathEditInProgress = false;
  private historyPath: any;


  constructor(
    private deviceSelectionService: DeviceSelectService,
    private configService: ConfigService,
    private controllerPath: ControllerPathService,
    private messageService: MessagingService,
    public themeService: ThemeService,
    private pathHistoryService: PathHistoryDedupeService,
  ) { }


  ngAfterViewInit(): void {
    this.map = L.map(this.uxMap.nativeElement, { editable: true, }).setView([0, 0], 0)
    this.configureUpdatesFromController();
    this.configureBaseMaps();
    this.addEditControls();
    this.addLocateControl();
    this.configureUpdatesFromGps();
    this.configureBroadcastUpdate();
  }


  ngOnDestroy(): void {
    this.messageService.removeMessageHandler(RemoteMessageTopics.BROADCAST_UPDATE)
  }


  private configureBroadcastUpdate(): void {
    this.messageService
      .addMessageHandler(RemoteMessageTopics.BROADCAST_UPDATE,
        payload => {
          let message = plainToInstance(Update, payload);
          this.remoteUpdateReceived(message.path)
        })
  }


  private async remoteUpdateReceived(path: LatLon[]): Promise<void> {
    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE) {
      // we sometimes receive rebound messages... IE draw a path on the remote, send it to the receiver,
      // the receiver then rebroadcasts "this is what i'm doing", at which point we try to update the map
      // on the remote... the problem is that if the user is in the process of modifying the path on the remote
      // at the time we receive the rebroadcast, we'll discard their edit and just overwrite the screen.
      // this prevents that.
      if (await this.pathHistoryService.historyContainsPath(path)) {
        console.log("Received path update matches previously sent path, not updating UI");
        return;
      }

      this.updatePathFromSourceOtherThanMap(path);
    }
  }


  private updatePathFromSourceOtherThanMap(path: LatLon[]): void {
    let uiPath: L.LatLng[] = undefined;
    if (path) {
      uiPath = path.map(single => new L.LatLng(single.latitude, single.longitude))
      if (this.currentLocation)
        uiPath.unshift(this.currentLocation);
    }

    this.clearAndDrawPath(uiPath)
  }


  private configureUpdatesFromController(): void {
    this.controllerPath.pathSubscription.subscribe(path => this.updatePathFromSourceOtherThanMap(path))
  }


  private configureBaseMaps(): void {
    let baseMaps = {
      "Open Street Maps": L.tileLayer.provider('OpenStreetMap.Mapnik'),
      "Esri Sat.": L.tileLayer.provider('Esri.WorldImagery', { className: "no-invert", maxNativeZoom: 19, maxZoom: 20 }),
      "Esri Topo": L.tileLayer.provider('Esri.WorldTopoMap', { maxNativeZoom: 19, maxZoom: 20 }),
      "USGS Topo": L.tileLayer.provider('USGS.USTopo', { maxNativeZoom: 16, maxZoom: 20 }),
      "USGS Sat. w Topo": L.tileLayer.provider('USGS.USImageryTopo', { maxNativeZoom: 16, maxZoom: 20, className: "no-invert" }),
      "USGS Sat.": L.tileLayer.provider('USGS.USImagery', { maxNativeZoom: 16, maxZoom: 20, className: "no-invert" }),
      "Dark": L.tileLayer.provider('CartoDB.DarkMatter', { className: "no-invert" }),
    }

    // set displayed map
    let savedMap = localStorage.getItem(this.MAP_BASE_LAYER);
    if (Object.hasOwn(baseMaps, savedMap))
      this.map.addLayer(baseMaps[savedMap as keyof typeof baseMaps]);
    else
      this.map.addLayer(baseMaps['Open Street Maps']);

    this.historyPath = L.polyline([], { color: 'crimson' }).addTo(this.map);
    let layers: L.Control.LayersObject = {
      "History": this.historyPath,
    }

    L.control.layers(baseMaps, layers).addTo(this.map);

    this.map.on('baselayerchange', (event) => localStorage.setItem(this.MAP_BASE_LAYER, event.name));
  }


  private configureUpdatesFromGps(): void {
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

        this.historyPath.setLatLngs(this.pathPoints);
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
        L.DomEvent.on(link, 'click', event => {
          L.DomEvent.stop(event);
          (window as any).LAYER = this.options.callback.call(map.editTools);
        }, this);

        return container;
      }
    });


    let newLineControl = editControl.extend({
      options: {
        position: 'topleft',
        callback: () => {
          if (this.pathDrawn || this.pathEditInProgress) {
            let pathToRemove = this.pathDrawn
            this.pathDrawn = undefined;
            if (pathToRemove)
              this.map.removeLayer(pathToRemove)
            this.redrawWaypointProximityCircles();
            this.pathEditInProgress = false;
            this.sendPathToController()
          } else {
            if (!this.deviceSelectionService.motorController.connected.value
              && this.configService.config.remoteReceiverMode !== RemoteReceiverMode.REMOTE) {
              let tooltip = L.tooltip({ direction: 'center' })
                .setContent("Connect or set to Remote mode draw a route")
                .setLatLng(this.map.getCenter())
                .addTo(this.map);

              setTimeout(() => {
                this.map.removeLayer(tooltip);
              }, 5000);
              return;
            }

            this.pathEditInProgress = true;
            this.pathDrawn = this.map.editTools.startPolyline(this.currentLocation, { color: "tomato", dashArray: '5, 15', dashOffset: '0' })
          }
        },
        kind: 'line',
        html: '\\/\\',
      }
    });

    // Disabling vertex:new there is no way to prevent a "new" vertex from triggering a path update,
    // as the new event gets fired even if the user is still dragging the vertex around.  so
    // a path update won't be triggered until the vertex is dragged
    // this.map.on('editable:vertex:new', (_event) => this.handlePathDrawingChanges());
    this.map.on('editable:vertex:deleted', (_event) => this.handlePathDrawingChanges());
    this.map.on('editable:vertex:dragend', (_event) => {
      this.pathEditInProgress = false;
      this.handlePathDrawingChanges()
    });
    this.map.on('editable:drawing:end', (_event) => {
      this.pathEditInProgress = false;
      this.handlePathDrawingChanges()
    });
    this.map.on('editable:drawing:move', (_event) => {
      this.pathEditInProgress = true;
      this.handlePathDrawingChanges()
    });

    this.map.addControl(new newLineControl())
  }


  private handlePathDrawingChanges = () => {
    if (!this.pathEditInProgress)
      this.sendPathToController()
    this.redrawWaypointProximityCircles()
  }


  private addLocateControl(): void {
    L.control.locate({
      showCompass: false,
      setView: "untilPan",
      keepCurrentZoomLevel: true,
      clickBehavior: { inView: 'stop', outOfView: 'setView', inViewNotFollowing: 'setView' }
    }).addTo(this.map);
  }


  private clearCircles(): void {
    this.waypointCircles.forEach(single => this.map.removeLayer(single))
    this.waypointCircles.length = 0
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
            interactive: false,
            radius: this.configService.config.waypointProximityMeters,
          }).addTo(this.map);

          this.waypointCircles.push(circle)
        })
    }
  }


  private sendPathToController(): void {
    let navCoordinates: LatLon[] = [];
    if (this.pathDrawn) {
      let mapCoordinates = (this.pathDrawn.getLatLngs() as L.LatLng[]);
      navCoordinates = mapCoordinates
        .slice(1)
        .map((single): LatLon => ({ latitude: single.lat, longitude: single.lng }))
    }

    console.log("path updated, navigating", navCoordinates)

    if (this.configService.config.remoteReceiverMode === RemoteReceiverMode.REMOTE) {
      this.pathHistoryService.addPathToHistory(navCoordinates);
      this.messageService.sendMessage(RemoteMessageTopics.NAVIGATE_ROUTE, navCoordinates);
    }

    if (this.deviceSelectionService.motorController.connected.value) {
      setTimeout(() => {
        this.controllerPath.enabled = navCoordinates.length > 0;
        this.controllerPath.command(navCoordinates);
      }, 0);
    }
  }

}
