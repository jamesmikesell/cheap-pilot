import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public themeSubscription = new BehaviorSubject<ThemeAndName>(undefined);
  public allowMapInversionSubscription = new BehaviorSubject<boolean>(undefined);

  get theme(): AppThemeNames { return this.themeSubscription.value.name }
  set theme(val: AppThemeNames) {
    let theme = this.getTheme(val);
    localStorage.setItem(this.THEME, "" + val);

    let reloadBgColor = theme.isDark ? "#171717" : "#fafafa";
    document.querySelector('meta[name="theme-color"]').setAttribute('content',  reloadBgColor);
    localStorage.setItem("APP_RELOAD_BG_COLOR", reloadBgColor);
    this.themeSubscription.next({ name: val, theme: theme });
  }

  get allowMapInversion(): boolean { return this.allowMapInversionSubscription.value }
  set allowMapInversion(val: boolean) {
    localStorage.setItem(this.ALLOW_MAP_INVERSION, "" + val);
    this.allowMapInversionSubscription.next(val);
  }


  private readonly THEME = "THEME";
  private readonly ALLOW_MAP_INVERSION = "ALLOW_MAP_INVERSION";
  private themeMap = new Map<AppThemeNames, AppTheme>();
  private lightTheme = new AppTheme("", false);




  constructor() {
    this.populateKeyMap();

    let themeName: AppThemeNames = this.getSavedThemeName();
    let theme = this.getTheme(themeName);
    this.themeSubscription.next({ name: themeName, theme: theme });

    this.allowMapInversion = (localStorage.getItem(this.ALLOW_MAP_INVERSION) ?? "true") === "true";
  }

  private populateKeyMap(): void {
    for (let key in AppThemeNames) {
      if (!isNaN(Number(key))) {
        let color = +key as AppThemeNames;
        switch (color) {
          case AppThemeNames.LIGHT:
            this.themeMap.set(color, this.lightTheme)
            break;
          case AppThemeNames.DARK:
            this.themeMap.set(color, new AppTheme("app-dark-theme", true))
            break;
          case AppThemeNames.NIGHT:
            this.themeMap.set(color, new AppTheme("app-night-theme", true))
            break;

          default:
            const exhaustiveCheck: never = color;
            throw new Error(`Unhandled case: ${exhaustiveCheck}`);
        }
      }
    }
  }

  private getTheme(themeName: AppThemeNames): AppTheme {
    let theme = this.themeMap.get(themeName);
    if (!theme) {
      console.error("missing theme", themeName)
      return this.lightTheme;
    }

    return theme;
  }


  private getSavedThemeName(): AppThemeNames {
    let savedVal = +localStorage.getItem(this.THEME);
    if (isNaN(savedVal))
      savedVal = 0;

    return savedVal;
  }

}


interface ThemeAndName {
  theme: AppTheme;
  name: AppThemeNames;
}

class AppTheme {
  constructor(
    public styleClass: string,
    public isDark: boolean,
  ) { }
}

export enum AppThemeNames {
  LIGHT,
  DARK,
  NIGHT,
}