import { Routes } from '@angular/router';
import { LayoutShellComponent } from './shared/components/layout-shell/layout-shell';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers').then((m) => m.CustomersComponent),
      },
      {
        path: 'deliveries',
        loadComponent: () => import('./features/deliveries/deliveries').then((m) => m.DeliveriesComponent),
      },
      {
        path: 'expenses',
        loadComponent: () => import('./features/expenses/expenses').then((m) => m.ExpensesComponent),
      },
      {
        path: 'payments',
        loadComponent: () => import('./features/payments/payments').then((m) => m.PaymentsComponent),
      },
      {
        path: 'missing-cans',
        loadComponent: () => import('./features/missing-cans/missing-cans').then((m) => m.MissingCansComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then((m) => m.ReportsComponent),
      },
      {
        path: 'monthly-delivery-reports',
        loadComponent: () =>
          import('./features/monthly-delivery-reports/monthly-delivery-reports').then(
            (m) => m.MonthlyDeliveryReportsComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
