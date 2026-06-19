import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AlertsComponent } from './pages/alerts/alerts';
import { AboutComponent } from './pages/about/about';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'alertas', component: AlertsComponent },
  { path: 'sobre', component: AboutComponent },
  { path: '**', redirectTo: '/dashboard' },
];
