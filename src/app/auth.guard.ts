// src/app/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router'; // <<-- CanActivateFn é para standalone guards
import { Auth, user } from '@angular/fire/auth'; // Importe 'Auth' e 'user' de '@angular/fire/auth'
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { inject } from '@angular/core'; // <<-- Importe 'inject' para standalone guards


export const authGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const auth = inject(Auth); // Injete o serviço Auth
  const router = inject(Router); // Injete o Router

  return user(auth).pipe( //observable 'user' para reagir a mudanças no estado de autenticação
    map(firebaseUser => {
      if (firebaseUser) {
        return true; // Usuário autenticado, permite acesso à rota
      } else {
        console.log('Acesso negado. Redirecionando para login.');
        // Usuário não autenticado, redireciona para a página de login
        return router.createUrlTree(['/login']); 
      }
    })
  );
};
