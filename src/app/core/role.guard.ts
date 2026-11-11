import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';
import { RoleService, AppRole } from '../services/role.service';

export function roleGuard(allowedRoles: AppRole[]): CanActivateFn {
  return async () => {
    const auth = inject(GoogleAuthService);
    const roleService = inject(RoleService);
    const router = inject(Router);
    await auth.restoreSession();
    await roleService.refresh();
    return auth.isSignedIn() && roleService.canAccess(allowedRoles)
      ? true
      : router.createUrlTree(['/login']);
  };
}
