import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(GoogleAuthService);
  const router = inject(Router);

  await authService.restoreSession();

  if (authService.isSignedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
