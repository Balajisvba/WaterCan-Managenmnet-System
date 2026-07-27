import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

export const authGuard: CanActivateFn = () => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const session = storage.getItem<{ username: string }>('aqua-login');

  if (session?.username) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
