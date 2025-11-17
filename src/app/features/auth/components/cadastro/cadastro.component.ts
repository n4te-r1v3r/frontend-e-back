import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// >> IMPORTAÇÕES DO FIREBASE <<
// Importe Auth para o serviço de autenticação
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
// Importe Firestore para o serviço de banco de dados e as funções modulares
import { Firestore, collection, doc, setDoc } from '@angular/fire/firestore';


@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterLink,
    // >> IMPORTS NECESSÁRIOS DO ANGULARFIRE PARA STANDALONE <<
    // Não precisamos de imports adicionais aqui porque os serviços Auth e Firestore
    // já são providos globalmente em main.ts e injetados diretamente.
    // RouterLink já está aqui, e é o que precisamos para a navegação.
  ],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.scss'
})
export class CadastroComponent {
  nome = '';
  sobrenome = '';
  email = '';
  password = '';
  confirmPassword = '';
  cargo = '';
  aceitaTermos = false;
  showPassword = false;
  showConfirmPassword = false;
  attempted = false;
  errorMessage: string | null = null; // Para exibir erros do Firebase

  constructor(
    private router: Router,
    // >> INJETE OS SERVIÇOS FIREBASE <<
    private auth: Auth,         // Serviço de Autenticação
    private firestore: Firestore // Serviço de Firestore
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  isEmailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  isPasswordValid(): boolean {
    // Sua validação de senha já está ok. Firebase Auth exige no mínimo 6 caracteres.
    return this.password.length >= 6;
  }

  passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  isFormValid(): boolean {
    // Use this.errorMessage para resetar ao revalidar
    this.errorMessage = null;

    if (!this.nome) return false;
    if (!this.sobrenome) return false;
    if (!this.email || !this.isEmailValid()) {
      if (this.attempted) this.errorMessage = 'Por favor, insira um e-mail válido.';
      return false;
    }
    if (!this.password || !this.isPasswordValid()) {
      if (this.attempted) this.errorMessage = 'A senha deve ter no mínimo 6 caracteres.';
      return false;
    }
    if (!this.confirmPassword || !this.passwordsMatch()) {
      if (this.attempted) this.errorMessage = 'As senhas não coincidem.';
      return false;
    }
    if (!this.cargo) return false;
    if (!this.aceitaTermos) {
      if (this.attempted) this.errorMessage = 'Você deve aceitar os termos de uso.';
      return false;
    }
    return true; // Se tudo estiver válido
  }

  async onCadastro() { // Marque a função como 'async'
    this.attempted = true;
    this.errorMessage = null; // Limpa erros anteriores do formulário ou Firebase

    if (this.isFormValid()) {
      try {
        // 1. Criar usuário no Firebase Authentication
        // Usa a função createUserWithEmailAndPassword do SDK modular
        const authResult = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
        const user = authResult.user;

        if (user) {
          // 2. Salvar dados adicionais no Cloud Firestore
          // Cria uma referência para o documento usando o UID do usuário
          const userDocRef = doc(collection(this.firestore, 'users'), user.uid);
          await setDoc(userDocRef, {
            nome: this.nome,
            sobrenome: this.sobrenome,
            email: this.email,
            cargo: this.cargo,
            createdAt: new Date(),
            uid: user.uid // É bom ter o UID também dentro do documento do Firestore
          });

          console.log('Cadastro e dados adicionais salvos com sucesso:', user);
          alert('Conta criada com sucesso! Redirecionando para login...'); // Mantenha o alert ou use um modal
          this.router.navigate(['/login']); // Redireciona para a tela de login
        }
      } catch (error: any) {
        // Captura e exibe erros do Firebase
        this.errorMessage = this.mapFirebaseAuthError(error.code);
        console.error('Erro no cadastro do Firebase:', error);
      }
    } else {
      // Se a validação do formulário falhar antes de tentar o Firebase
      if (!this.errorMessage) { // Se não tiver sido definido por isFormValid
         this.errorMessage = 'Por favor, preencha todos os campos corretamente.';
      }
    }
  }

  // Mapeia códigos de erro do Firebase para mensagens amigáveis
  private mapFirebaseAuthError(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso.';
      case 'auth/invalid-email':
        return 'O formato do e-mail é inválido.';
      case 'auth/operation-not-allowed':
        return 'Cadastro por e-mail e senha não está habilitado. Contate o suporte.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.'; // Sua validação já cobre isso, mas é bom ter
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }
}
