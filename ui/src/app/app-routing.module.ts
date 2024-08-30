import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfigPageComponent } from './component/config-page/config-page.component';
import { FullScreenMapComponent } from './component/full-screen-map/full-screen-map.component';

const routes: Routes = [
  {
    path: '',
    component: FullScreenMapComponent
  },
  {
    path: 'config',
    component: ConfigPageComponent
  },
  {
    path: 'full-map',
    component: FullScreenMapComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
