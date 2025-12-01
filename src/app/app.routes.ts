import { Routes } from '@angular/router';

// Rotas de Autenticação (manter importadas se forem usadas no carregamento inicial)
import { LoginComponent } from './features/auth/components/login.component';
import { CadastroComponent } from './features/auth/components/cadastro/cadastro.component';
import { EsqueciSenhaComponent } from './features/auth/components/esqueci-senha/esqueci-senha.component';

// O AuthGuard é essencial para proteger as rotas
import { authGuard } from './auth.guard'; 


export const routes: Routes = [
  // Rotas que NÃO precisam de autenticação (públicas)
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'cadastro', component: CadastroComponent },
  { path: 'esqueci-senha', component: EsqueciSenhaComponent },

  // >> ROTAS QUE PRECISAM DE AUTENTICAÇÃO (usando Lazy Loading com loadComponent) <<
  // CORREÇÃO: Removemos as importações diretas no topo e usamos loadComponent
  { 
    path: 'dashboard', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/components/dashboard.component')
      .then(m => m.DashboardComponent)
  },
  { 
    path: 'ativos', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/ativos/components/ativos.component')
      .then(m => m.AtivosComponent)
  },
  { 
    path: 'ativos/novo', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/ativos/asset-form/asset-form.component')
      .then(m => m.AssetFormComponent)
  },
  { 
    path: 'chamados', 
    canActivate: [authGuard],
    // CORRIGIDO: Usando Lazy Loading para ChamadosComponent
    loadComponent: () => import('./features/chamados/components/chamados.component')
      .then(m => m.ChamadosComponent)
  },
  { 
    path: 'relatorios', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/relatorios/components/relatorios.component')
      .then(m => m.RelatoriosComponent)
  },

  // Rota curinga para redirecionamento
  { path: '**', redirectTo: '/dashboard' } 
];