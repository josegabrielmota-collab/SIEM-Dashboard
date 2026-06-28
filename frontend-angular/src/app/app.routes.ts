import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AlertsComponent } from './pages/alerts/alerts';
import { AboutComponent } from './pages/about/about';
import { ReportComponent } from './pages/report/report';

export const routes: Routes = [
  { path: '',          redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',     component: LoginComponent },
  { path: 'sobre',     component: AboutComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'alertas',   component: AlertsComponent },
  { path: 'relatorio', component: ReportComponent },
  { path: '**',        redirectTo: '/sobre' },
];