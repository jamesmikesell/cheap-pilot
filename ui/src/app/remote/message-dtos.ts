import { Type } from "class-transformer";
import { DisplayStats } from "../component/display-stats/display-stats.component";
import { GpsSensorData } from "../service/sensor-gps.service";
import { LatLon, LatLonInst } from "../utils/coordinate-utils";


export class StatsBroadcast {
  displayStats: DisplayStats;
  currentPosition: GpsSensorData;
  @Type(() => LatLonInst)
  path: LatLon[];
  @Type(() => Date)
  timestamp: Date;
}
