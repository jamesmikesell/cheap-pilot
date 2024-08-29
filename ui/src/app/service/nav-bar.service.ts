import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavBarService {

  drawerToggle = new Subject<void>();
  private _navBarShown = true;

  set showNavBar(show: boolean) {
    setTimeout(() => {
      this._navBarShown = show;
    }, 0);
  }
  get showNavBar(): boolean { return this._navBarShown };

}
