import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FullScreenMapComponent } from './component/full-screen-map/full-screen-map.component';
import { TestComponent } from './component/test/test.component';

const routes: Routes = [
  {
    path: '',
    component: FullScreenMapComponent
  },
  {
    path: 'config',
    component: TestComponent
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
