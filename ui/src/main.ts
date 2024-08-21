import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import "reflect-metadata";
import * as L from 'leaflet';

import { AppModule } from './app/app.module';


L.Icon.Default.imagePath = "assets/"


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
