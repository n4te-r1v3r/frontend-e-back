import { Component, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// --NOVO--
// Importações do Firebase Auth
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { environment } from '../../../../../environments/environments';
// --FIM DO NOVO--

@Component({
  selector: 'app-esqueci-senha',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './esqueci-senha.component.html',
  styleUrl: './esqueci-senha.component.scss'
})
export class EsqueciSenhaComponent implements OnDestroy {
  email = '';
  attempted = false;
  isLoading = false;
  emailSent = false;
  resendCooldown = 0;
  private cooldownInterval?: number;
  // --NOVO--
  errorMessage: string | null = null; // Propriedade para exibir erros do Firebase
  // --FIM DO NOVO--
  
  constructor(
    // --NOVO--
    private auth: Auth // Injete o serviço Auth
    // --FIM DO NOVO--
  ) {}

  isEmailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  // --NOVO--
  // Método onSubmit() atualizado para usar Firebase Authentication
  async onSubmit() { // Marcado como 'async'
    this.attempted = true;
    this.errorMessage = null; // Limpa mensagens de erro anteriores

    if (this.email && this.isEmailValid()) {
      this.isLoading = true;
      try {
        // Firebase Auth ActionCodeSettings para redirecionamento após a redefinição
        // Use o URL do seu localhost durante o desenvolvimento.
        const actionCodeSettings = {
          url: environment.resetPasswordUrl,
          handleCodeInApp: true
        };

        await sendPasswordResetEmail(this.auth, this.email, actionCodeSettings);
        this.emailSent = true;
        this.startResendCooldown(); // Inicia o cooldown após o envio bem-sucedido
        console.log('E-mail de recuperação de senha enviado para:', this.email);
      } catch (error: any) {
        this.errorMessage = this.mapFirebaseAuthError(error.code); // Mapeia e exibe erros do Firebase
        console.error('Erro ao enviar e-mail de recuperação:', error);
        this.emailSent = false; // Garante que a tela de sucesso não seja exibida em caso de erro
      } finally {
        this.isLoading = false; // Finaliza o estado de carregamento
      }
    } else {
      // Adiciona mensagem de erro genérica se a validação local falhar
      if (!this.errorMessage) {
         this.errorMessage = 'Por favor, insira um e-mail válido.';
      }
    }
  }
  // --FIM DO NOVO--

  // --NOVO--
  // Método resendEmail() atualizado para usar Firebase Authentication
  async resendEmail() { // Marcado como 'async'
    if (this.resendCooldown > 0 || this.isLoading) return; // Impede reenvio enquanto em cooldown ou carregando

    this.isLoading = true;
    this.errorMessage = null; // Limpa erros anteriores
    console.log('Tentando reenviar e-mail de recuperação para:', this.email);

    try {
      // Reutiliza as mesmas configurações de ação
      const actionCodeSettings = {
        url: environment.resetPasswordUrl,
        handleCodeInApp: true
      };
      await sendPasswordResetEmail(this.auth, this.email, actionCodeSettings);
      console.log('E-mail de recuperação reenviado com sucesso.');
      this.startResendCooldown(); // Reinicia o contador de cooldown
    } catch (error: any) {
      this.errorMessage = this.mapFirebaseAuthError(error.code); // Mapeia e exibe erros
      console.error('Erro ao reenviar e-mail de recuperação:', error);
    } finally {
      this.isLoading = false; // Finaliza o estado de carregamento
    }
  }

  // Método auxiliar para iniciar/reiniciar o cooldown
  private startResendCooldown() {
    this.resendCooldown = 60; // 60 segundos de cooldown
    this.clearCooldown(); // Garante que não há múltiplos intervalos rodando
    this.cooldownInterval = window.setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.clearCooldown();
      }
    }, 1000);
  }

  // Método clearCooldown() - Mantido como está, pois é chamado pelo startResendCooldown e ngOnDestroy
  private clearCooldown() {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = undefined;
    }
  }

  ngOnDestroy() {
    this.clearCooldown();
  }
  
  // --NOVO--
  private mapFirebaseAuthError(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'O e-mail fornecido é inválido.';
      case 'auth/user-not-found':
        return 'Não há registro de usuário correspondente a este e-mail.';
      case 'auth/missing-continue-uri':
        return 'A URL de continuação é obrigatória. Contate o suporte.';
      case 'auth/unauthorized-continue-uri':
        return 'O domínio da URL de continuação não está autorizado. Verifique os domínios autorizados no console Firebase.';
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }
}
