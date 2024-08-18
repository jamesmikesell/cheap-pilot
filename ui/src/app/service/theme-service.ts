import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME = "THEME";
  private readonly ALLOW_MAP_INVERSION = "ALLOW_MAP_INVERSION";

  public darkModeSubscription = new BehaviorSubject<boolean>(undefined);
  public allowMapInversionSubscription = new BehaviorSubject<boolean>(undefined);

  get darkMode(): boolean { return this.darkModeSubscription.value; }
  set darkMode(val: boolean) {
    localStorage.setItem(this.THEME, "" + val);
    this.darkModeSubscription.next(val);
  }

  get allowMapInversion(): boolean { return this.allowMapInversionSubscription.value; }
  set allowMapInversion(val: boolean) {
    localStorage.setItem(this.ALLOW_MAP_INVERSION, "" + val);
    this.allowMapInversionSubscription.next(val);
  }


  constructor() {
    this.darkMode = (localStorage.getItem(this.THEME) ?? "true") === "true";
    this.allowMapInversion = (localStorage.getItem(this.ALLOW_MAP_INVERSION) ?? "true") === "true";
  }
}
