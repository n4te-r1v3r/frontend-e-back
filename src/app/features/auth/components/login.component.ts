// src/app/login/login.component.ts
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// >> IMPORTS DO FIREBASE AUTH <<
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth'; // Importe Auth e o método de login

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false; // Firebase Auth gerencia a persistência, mas podemos usar isso para configurar.
  showPassword = false;
  attempted = false;
  errorMessage: string | null = null; // <<-- NOVO: Para exibir erros do Firebase

  // >> INJETE O SERVIÇO AUTH <<
  constructor(private router: Router, private auth: Auth) {} // <<-- Injete o 'Auth' aqui

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onLogin() { // <<-- O método deve ser async para usar await
    this.attempted = true;
    this.errorMessage = null; // Limpa mensagens de erro anteriores

    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, preencha o e-mail e a senha.';
      return; // Impede a tentativa de login se os campos estiverem vazios
    }

    try {
      // >> TENTA FAZER LOGIN COM FIREBASE <<
      const userCredential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
      console.log('Login bem-sucedido!', userCredential.user);

      // Você pode configurar a persistência da sessão aqui se quiser um controle mais granular
      // (embora o Firebase gerencie isso automaticamente por padrão).
      // Por exemplo, para sessões curtas sem "Lembrar de mim":
      // await this.auth.setPersistence(this.rememberMe ? browserLocalPersistence : browserSessionPersistence);

      // Redireciona para a página principal. Use '/home' ou a rota que você protegerá.
      this.router.navigate(['/home']); // <<-- escolhi o /home
    } catch (error: any) {
      console.error('Erro no login:', error);
      // >> TRATA ERROS DO FIREBASE <<
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          this.errorMessage = 'E-mail ou senha inválidos.';
          break;
        case 'auth/invalid-email':
          this.errorMessage = 'Formato de e-mail inválido.';
          break;
        case 'auth/user-disabled':
          this.errorMessage = 'Esta conta foi desativada.';
          break;
        default:
          this.errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
          break;
      }
    }
  }
}