import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import * as L from 'leaflet';


L.Icon.Default.imagePath = "assets/"


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
