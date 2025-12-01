import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { tap, takeUntil } from 'rxjs/operators';

import { FirestoreService, Chamado, Asset } from '../../../services/firestore.service';

type ViewMode = 'detail' | 'create';
type ToastType = 'success' | 'error' | 'info';

@Component({
  selector: 'app-chamados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chamados.component.html',
  styleUrl: './chamados.component.scss'
})
export class ChamadosComponent implements OnInit, OnDestroy {
  private firestoreService = inject(FirestoreService);
  private destroy$ = new Subject<void>();

  tickets$!: Observable<Chamado[]>;
  assets$!: Observable<Asset[]>;
  private assetsSnapshot: Asset[] = [];

  viewMode: ViewMode = 'detail';
  selectedTicket: Chamado | null = null;

  newTicketAssetId?: string;
  newTicketTitle = '';
  newTicketDescription = '';
  newTicketPriority: Chamado['priority'] = 'Alta';

  showToastFlag = false;
  toastMessage = '';
  toastType: ToastType = 'info';
  private toastTimeout?: ReturnType<typeof setTimeout>;

  isGeneratingQR = false;

  ngOnInit(): void {
    this.tickets$ = this.firestoreService.getChamados();
    this.assets$ = this.firestoreService.getAssets().pipe(
      tap(assets => this.assetsSnapshot = assets)
    );

    this.assets$
      .pipe(takeUntil(this.destroy$))
      .subscribe(); // mantém o snapshot atualizado
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  trackTicket(index: number, ticket: Chamado) {
    return ticket.id ?? index;
  }

  trackAsset(index: number, asset: Asset) {
    return asset.id ?? index;
  }

  selectTicket(ticket: Chamado) {
    this.selectedTicket = ticket;
    this.viewMode = 'detail';
  }

  openCreateTicketModal() {
    this.resetNewTicketForm();
    this.selectedTicket = null;
    this.viewMode = 'create';
  }

  closeCreateTicketModal() {
    this.viewMode = 'detail';
  }

  async saveNewTicket() {
    if (!this.newTicketAssetId || !this.newTicketTitle.trim() || !this.newTicketDescription.trim()) {
      this.showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    const selectedAsset = this.assetsSnapshot.find(asset => asset.id === this.newTicketAssetId);
    if (!selectedAsset) {
      this.showToast('Ativo selecionado inválido.', 'error');
      return;
    }

    const payload: Omit<Chamado, 'id' | 'createdAt'> = {
      assetId: selectedAsset.id!,
      assetName: selectedAsset.name,
      authorId: 'helpdesk-operator',
      authorName: 'HelpDesk',
      description: this.newTicketDescription.trim(),
      priority: this.newTicketPriority,
      status: 'Aberto',
      title: this.newTicketTitle.trim()
    };

    try {
      await this.firestoreService.addChamado(payload);
      this.showToast('Chamado criado com sucesso!', 'success');
      this.closeCreateTicketModal();
      this.resetNewTicketForm();
    } catch (error) {
      console.error('Erro ao salvar chamado:', error);
      this.showToast('Não foi possível salvar o chamado.', 'error');
    }
  }

  async toggleStatus(ticket: Chamado) {
    const updatedStatus = ticket.status === 'Resolvido' ? 'Aberto' : 'Resolvido';
    const updatedTicket: Chamado = {
      ...ticket,
      status: updatedStatus,
      resolvedAt: updatedStatus === 'Resolvido' ? new Date() : undefined
    };

    try {
      await this.firestoreService.updateChamado(updatedTicket);
      this.showToast(
        updatedStatus === 'Resolvido' ? 'Chamado marcado como resolvido.' : 'Chamado reaberto.',
        'success'
      );
    } catch (error) {
      console.error('Erro ao atualizar status do chamado:', error);
      this.showToast('Não foi possível atualizar o status.', 'error');
    }
  }

  async deleteSelectedTicket() {
    if (!this.selectedTicket?.id) {
      return;
    }

    const confirmation = confirm('Deseja realmente excluir este chamado? Esta ação não pode ser desfeita.');
    if (!confirmation) {
      return;
    }

    try {
      await this.firestoreService.deleteChamado(this.selectedTicket.id);
      this.showToast('Chamado excluído com sucesso.', 'success');
      this.selectedTicket = null;
    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      this.showToast('Não foi possível excluir o chamado.', 'error');
    }
  }

  generateQRCode(ticket: Chamado) {
    this.isGeneratingQR = true;
    setTimeout(() => {
      this.isGeneratingQR = false;
      this.showToast(`QR Code gerado para ${ticket.assetName}.`, 'info');
    }, 800);
  }

  closeToast() {
    this.showToastFlag = false;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  private showToast(message: string, type: ToastType) {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.showToastFlag = false;
    }, 4000);
  }

  private resetNewTicketForm() {
    this.newTicketAssetId = undefined;
    this.newTicketTitle = '';
    this.newTicketDescription = '';
    this.newTicketPriority = 'Alta';
  }
}