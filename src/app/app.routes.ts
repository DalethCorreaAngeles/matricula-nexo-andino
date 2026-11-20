import { Routes } from '@angular/router';
import { OfertaCursosComponent } from './components/oferta-cursos/oferta-cursos.component';
import { MatricularmeComponent } from './components/matricularme/matricularme.component';
import { RegistrarPagoComponent } from './components/registrar-pago/registrar-pago.component';
import { PanelAsesorComponent } from './components/panel-asesor/panel-asesor.component';

export const routes: Routes = [
  { path: '', redirectTo: 'oferta-cursos', pathMatch: 'full' },
  { path: 'oferta-cursos', component: OfertaCursosComponent, title: 'Oferta de Cursos - Nexo Andino' },
  { path: 'matricularme', component: MatricularmeComponent, title: 'Matricularme - Nexo Andino' },
  { path: 'registrar-pago', component: RegistrarPagoComponent, title: 'Registrar Pago - Nexo Andino' },
  { path: 'panel-asesor', component: PanelAsesorComponent, title: 'Panel del Asesor - Nexo Andino' },
  { path: '**', redirectTo: 'oferta-cursos' }
];
