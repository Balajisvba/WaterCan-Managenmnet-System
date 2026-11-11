import { Routes } from '@angular/router';
import { LayoutShellComponent } from './shared/components/layout-shell/layout-shell';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';

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
        canActivate: [roleGuard(['Admin', 'Driver'])],
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'customers',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/customers/customers').then((m) => m.CustomersComponent),
      },
      {
        path: 'drivers',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/drivers/drivers').then((m) => m.DriversComponent),
      },
      {
        path: 'deliveries',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/deliveries/deliveries').then((m) => m.DeliveriesComponent),
      },
      {
        path: 'inventory',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/inventory/inventory').then((m) => m.InventoryComponent),
      },
      {
        path: 'expenses',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/expenses/expenses').then((m) => m.ExpensesComponent),
      },
      {
        path: 'payments',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/payments/payments').then((m) => m.PaymentsComponent),
      },
      {
        path: 'missing-cans',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/missing-cans/missing-cans').then((m) => m.MissingCansComponent),
      },
      {
        path: 'reports',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/reports/reports').then((m) => m.ReportsComponent),
      },
      {
        path: 'monthly-delivery-reports',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/monthly-delivery-reports/monthly-delivery-reports').then((m) => m.MonthlyDeliveryReportsComponent),
      },
      {
        path: 'settings',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/settings/settings').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
