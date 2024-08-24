import { Injectable } from '@angular/core';
import { LatLon } from '../utils/coordinate-utils';
import { Encryption } from '../remote/encryption';
import { timer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PathHistoryDedupeService {

  private sentPathHistory = new Map<string, Date>();


  constructor() {
    const purgeHistoriesOlderThanSeconds = 30;
    timer(0, 10000)
      .subscribe(() => {
        this.sentPathHistory.forEach((date, key) => {
          if ((Date.now() - date.getTime()) > purgeHistoriesOlderThanSeconds * 1000)
            this.sentPathHistory.delete(key);
        });
      });
  }


  async historyContainsPath(path: LatLon[]): Promise<boolean> {
    if (path && path.length && this.sentPathHistory.has(await this.pathToKey(path)))
      return true
    return false
  }


  async addPathToHistory(path: LatLon[]): Promise<void> {
    if (path && path.length)
      this.sentPathHistory.set(await this.pathToKey(path), new Date());
  }


  private async pathToKey(path: LatLon[]): Promise<string> {
    let pathString = "";
    path.forEach(single => pathString += `${single.latitude},${single.longitude}`)

    return await Encryption.hashString(pathString)
  }

}
