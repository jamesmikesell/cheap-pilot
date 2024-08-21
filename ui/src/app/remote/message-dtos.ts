import { Type } from "class-transformer";
import { LatLon, LatLonInst } from "../utils/coordinate-utils";

export class Update {
  @Type(() => LatLonInst)
  path: LatLon[];
}