import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login.component';
import { CadastroComponent } from './features/auth/components/cadastro/cadastro.component';
import { EsqueciSenhaComponent } from './features/auth/components/esqueci-senha/esqueci-senha.component';

// caso precise de componentes principais que precisam de autenticação
import { DashboardComponent } from './features/dashboard/components/dashboard.component';
import { AtivosComponent } from './features/ativos/components/ativos.component';
import { AssetFormComponent } from './features/ativos/asset-form/asset-form.component';
import { ChamadosComponent } from './features/chamados/components/chamados.component';
import { RelatoriosComponent } from './features/relatorios/components/relatorios.component';
import { authGuard } from './auth.guard'; 


export const routes: Routes = [
  // Rotas que NÃO precisam de autenticação (públicas)
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Redireciona a raiz para o login
  { path: 'login', component: LoginComponent },
  { path: 'cadastro', component: CadastroComponent },
  { path: 'esqueci-senha', component: EsqueciSenhaComponent },

  // >> ROTAS QUE PRECISAM DE AUTENTICAÇÃO <<
  // lembrete paginas futuras == Adicione 'canActivate: [authGuard]' para proteger estas rotas
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuard] // Protegido pra porr!
  },
  { 
    path: 'ativos', 
    component: AtivosComponent,
    canActivate: [authGuard] // Protegido pra porr!
  },
  { path: 'ativos/novo', component: AssetFormComponent, canActivate: [authGuard] },
  { 
    path: 'chamados', 
    component: ChamadosComponent,
    canActivate: [authGuard] // Protegido pra porr!
  },
  { 
    path: 'relatorios', 
    component: RelatoriosComponent,
    canActivate: [authGuard] // Protegido pra porr!
  },

  // Opcional: Rota cúringa para redirecionar usuários para o dashboard se estiverem logados,
  // ou para o login se não estiverem 
  { path: '**', redirectTo: '/dashboard' } // Redireciona qualquer URL desconhecida para o dashboard (que será protegida)
];
