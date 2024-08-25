import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-display-stats',
  templateUrl: './display-stats.component.html',
  styleUrls: ['./display-stats.component.scss']
})
export class DisplayStatsComponent {
  @Input() config: DisplayStats;
}


export interface DisplayStats {
  controllerPath: boolean;
  controllerOrientation: boolean;
  controllerRotationRate: boolean;
  speedKts: number;
  headingDesiredGps: number;
  headingDesiredCompass: number;
  headingCurrentDrift: number;
  headingCurrentGps: number;
  headingCurrentCompass: number;
}
