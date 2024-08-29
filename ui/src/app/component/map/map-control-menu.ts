import { Injectable } from "@angular/core";
import * as L from "leaflet";
import { NavBarService } from "src/app/service/nav-bar.service";
import { ControlType } from "./map.component";


@Injectable({
  providedIn: 'root'
})
export class MapControlMenu {


  constructor(
    private navBarService: NavBarService,
  ) { }


  getControl(): ControlType {
    return L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        const button = L.DomUtil.create('a', 'leaflet-menu-button', container);
        button.innerHTML = '<span class="material-icons">menu</span>';
        button.href = '#';

        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.stop(e);
          this.navBarService.drawerToggle.next();
        });

        return container;
      }
    });
  }


}
