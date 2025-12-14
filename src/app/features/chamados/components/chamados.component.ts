import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil, map } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';

// [ALTERAÇÃO CRUCIAL 1]: Importa o módulo 'qrcode' diretamente.
import * as QRCode from 'qrcode'; 

import { FirestoreService, Chamado, Asset } from '../../../services/firestore.service';

type ViewMode = 'list' | 'grid';
type ToastType = 'success' | 'error' | 'info';

@Component({
  selector: 'app-chamados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chamados.component.html',
  styleUrl: './chamados.component.scss',
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class ChamadosComponent implements OnInit, OnDestroy, AfterViewChecked {
  // Referência ao elemento CANVAS no HTML para desenhar o QR Code
  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  private router = inject(Router);
  private firestoreService = inject(FirestoreService);
  private destroy$ = new Subject<void>();

  // Observables
  tickets$!: Observable<Chamado[]>;
  assets$!: Observable<Asset[]>;
  
  // Cache de ativos para busca rápida
  private assetCache: Asset[] = [];

  // Estado da aplicação
  viewMode: ViewMode = 'list';
  selectedTicket: Chamado | null = null;
  showCreateModal = false;

  // Formulário de novo chamado
  newTicketAssetId?: string;
  newTicketTitle = '';
  newTicketDescription = '';
  newTicketPriority: Chamado['priority'] = 'Média';

  // Toast
  showToastFlag = false;
  toastMessage = '';
  toastType: ToastType = 'info';
  private toastTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  // [ADIÇÃO]: Hook para gerar QR Code sempre que o ticket selecionado mudar
  ngAfterViewChecked(): void {
    // Usamos setTimeout para garantir que a DOM foi renderizada e a referência está pronta
    if (this.selectedTicket && this.qrCanvas) {
        setTimeout(() => this.generateQRCode(), 0);
    }
  }

  // === MÉTODOS DE DADOS ===
  private loadData(): void {
    this.tickets$ = this.firestoreService.getChamados();
    
    // Carrega ativos e popula o cache
    this.assets$ = this.firestoreService.getAssets().pipe(
      takeUntil(this.destroy$),
      map(assets => {
        this.assetCache = assets; // Popula o cache
        return assets;
      })
    );
  }

  trackTicket(index: number, ticket: Chamado): string {
    return ticket.id ?? index.toString();
  }

  trackAsset(index: number, asset: Asset): string {
    return asset.id ?? index.toString();
  }

  // === MÉTODOS DE VISUALIZAÇÃO ===
  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.announceAction(`Modo de visualização alterado para ${mode === 'list' ? 'lista' : 'grade'}`);
  }

  selectTicket(ticket: Chamado): void {
    this.selectedTicket = ticket;
    this.announceAction(`Chamado selecionado: ${ticket.title}`);
  }

  closeDetails(): void {
    this.selectedTicket = null;
    this.announceAction('Detalhes fechados');
  }

  // === MÉTODOS DO MODAL ===
  openCreateModal(): void {
    this.showCreateModal = true;
    this.resetNewTicketForm();
    this.announceAction('Modal de novo chamado aberto');
    
    // Trap focus no modal
    setTimeout(() => {
      const firstInput = document.querySelector('.modal-content input, .modal-content select') as HTMLElement;
      firstInput?.focus();
    }, 100);
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.announceAction('Modal de novo chamado fechado');
  }

  // === MÉTODOS DE CHAMADO ===
  async saveNewTicket(): Promise<void> {
    if (!this.isFormValid()) {
      this.showToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    const payload: Omit<Chamado, 'id' | 'createdAt'> = {
      assetId: this.newTicketAssetId!,
      // Corrigido: Agora usa o método auxiliar para buscar o nome
      assetName: this.getAssetName(this.newTicketAssetId!), 
      authorId: 'current-user-id', // TODO: Pegar do serviço de autenticação
      authorName: 'Usuário Atual', // TODO: Pegar do serviço de autenticação
      description: this.newTicketDescription.trim(),
      priority: this.newTicketPriority,
      status: 'Aberto',
      title: this.newTicketTitle.trim()
    };

    try {
      await this.firestoreService.addChamado(payload);
      this.showToast('Chamado criado com sucesso!', 'success');
      this.closeCreateModal();
      this.resetNewTicketForm();
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      this.showToast('Erro ao criar chamado', 'error');
    }
  }

  async toggleStatus(ticket: Chamado): Promise<void> {
    const newStatus = ticket.status === 'Resolvido' ? 'Aberto' : 'Resolvido';
    const updatedTicket: Chamado = {
      ...ticket,
      status: newStatus,
      resolvedAt: newStatus === 'Resolvido' ? new Date() : undefined
    };

    try {
      await this.firestoreService.updateChamado(updatedTicket);
      this.showToast(
        newStatus === 'Resolvido' ? 'Chamado marcado como resolvido' : 'Chamado reaberto',
        'success'
      );
      
      // Atualizar ticket selecionado se for o mesmo
      if (this.selectedTicket?.id === ticket.id) {
        this.selectedTicket = updatedTicket;
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      this.showToast('Erro ao atualizar status', 'error');
    }
  }

  async deleteTicket(ticket: Chamado): Promise<void> {
    if (!ticket.id) return;

    const confirmation = confirm(`Deseja realmente excluir o chamado "${ticket.title}"?`);
    if (!confirmation) return;

    try {
      await this.firestoreService.deleteChamado(ticket.id);
      this.showToast('Chamado excluído com sucesso', 'success');
      
      // Fechar detalhes se for o ticket selecionado
      if (this.selectedTicket?.id === ticket.id) {
        this.closeDetails();
      }
    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      this.showToast('Erro ao excluir chamado', 'error');
    }
  }

  // === MÉTODOS DE QR CODE E AÇÕES ===

  private getQRData(ticket: Chamado): string {
    const baseUrl = window.location.origin + this.router.createUrlTree(['/chamados', ticket.id]).toString();
    
    return JSON.stringify({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      asset: ticket.assetName,
      link: baseUrl
    });
  }

  /**
   * [ALTERAÇÃO CRUCIAL 2]: Usa QRCode.toCanvas do módulo importado.
   * Gera e desenha o QR Code no elemento canvas.
   */
  generateQRCode(): void {
    if (!this.selectedTicket || !this.qrCanvas) {
      return;
    }

    const canvasElement = this.qrCanvas.nativeElement;
    const data = this.getQRData(this.selectedTicket);

    // Limpar o canvas antes de desenhar
    const context = canvasElement.getContext('2d');
    if (context) {
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }
    
    try {
        QRCode.toCanvas(canvasElement, data, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        })
        .catch(error => {
            console.error("Erro ao gerar QR Code:", error);
            this.showToast('Erro ao gerar QR Code', 'error');
        });
    } catch (error) {
        console.error("Erro ao chamar QRCode.toCanvas:", error);
    }
  }

  /**
   * Baixa o QR Code gerado como um arquivo PNG.
   */
  downloadQRCode(): void {
    if (!this.selectedTicket || !this.qrCanvas) {
      this.showToast('Nenhum chamado selecionado para download.', 'error');
      return;
    }
    
    const canvas = this.qrCanvas.nativeElement;
    
    if (canvas instanceof HTMLCanvasElement) {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `chamado-${this.selectedTicket.id}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('QR Code baixado com sucesso!', 'success');
    } else {
         this.showToast('Erro: Elemento canvas não encontrado.', 'error');
    }
  }
  
  /**
   * Copia os dados brutos do QR Code para a área de transferência.
   */
  copyQRData(): void {
    if (!this.selectedTicket) {
      this.showToast('Nenhum chamado selecionado.', 'error');
      return;
    }
    
    const data = this.getQRData(this.selectedTicket);
    
    navigator.clipboard.writeText(data)
      .then(() => {
        this.showToast('Dados do QR Code copiados!', 'success');
      })
      .catch(err => {
        console.error('Erro ao copiar dados:', err);
        this.showToast('Erro ao copiar dados. Tente manualmente.', 'error');
      });
  }

  /**
   * Abre a caixa de diálogo de impressão para o detalhe do chamado.
   */
  printQRCode(): void {
    if (!this.selectedTicket) {
      this.showToast('Nenhum chamado selecionado para impressão.', 'error');
      return;
    }
    
    // Simplificado: abre a tela de impressão
    window.print();
  }

  // === MÉTODOS AUXILIARES ===
  isFormValid(): boolean {
    return !!(
      this.newTicketAssetId &&
      this.newTicketTitle.trim() &&
      this.newTicketDescription.trim() &&
      this.newTicketPriority
    );
  }

  private resetNewTicketForm(): void {
    this.newTicketAssetId = undefined;
    this.newTicketTitle = '';
    this.newTicketDescription = '';
    this.newTicketPriority = 'Média';
  }

  /**
   * Implementação real para buscar o nome do ativo a partir do cache.
   */
  private getAssetName(assetId: string): string {
     const asset = this.assetCache.find(a => a.id === assetId);
     return asset?.name || 'Ativo Desconhecido';
  }

  getTicketAriaLabel(ticket: Chamado): string {
    return `Chamado: ${ticket.title}, Prioridade: ${ticket.priority}, Status: ${ticket.status}`;
  }

  getTimeAgo(date: Date | undefined): string {
    if (!date) return 'Data desconhecida';
    
    const now = new Date();
    // Converte para objeto Date se for um timestamp Firestore
    const ticketDate = date instanceof Date ? date : new Date(date);
    const diffMs = now.getTime() - ticketDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return ticketDate.toLocaleDateString('pt-BR');
  }

  // === MÉTODOS DE TOAST ===
  private showToast(message: string, type: ToastType): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.closeToast();
    }, 4000);
  }

  closeToast(): void {
    this.showToastFlag = false;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  // === MÉTODOS DE ACESSIBILIDADE ===
  private announceAction(message: string): void {
    const announcer = document.getElementById('status-announcements');
    if (announcer) {
      announcer.textContent = message;
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  }
}