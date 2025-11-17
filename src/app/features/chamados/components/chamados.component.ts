import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import * as QRCode from 'qrcode';

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  status: 'Aberto' | 'Em Andamento' | 'Pendente' | 'Resolvido' | 'Fechado';
  equipment: string;
  requester: string;
  createdAt: Date;
  lastModified: Date;
  lastChange: string;
}

type ViewMode = 'list' | 'grid';
type ToastType = 'success' | 'error' | 'info';

@Component({
  selector: 'app-chamados',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './chamados.component.html',
  styleUrl: './chamados.component.scss'
})
export class ChamadosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('qrCanvas', { static: false }) qrCanvas!: ElementRef<HTMLCanvasElement>;
  
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private destroy$ = new Subject<void>();

  // Estado da aplicação
  viewMode: ViewMode = 'list';
  selectedTicket: Ticket | null = null;
  isGeneratingQR = false;
  
  // Toast notifications
  toastMessage = '';
  toastType: ToastType = 'info';
  private toastTimeout?: number;

  // Dados dos tickets (simulados)
  tickets: Ticket[] = [
    {
      id: '001',
      title: 'Problema na impressora HP LaserJet',
      description: 'Impressora não está funcionando corretamente, apresentando falhas de impressão e ruídos estranhos.',
      priority: 'Alta',
      status: 'Aberto',
      equipment: 'HP LaserJet Pro 404n',
      requester: 'Maria Santos',
      createdAt: new Date('2024-10-08T09:30:00'),
      lastModified: new Date('2024-10-10T14:20:00'),
      lastChange: 'Substituição do toner'
    },
    {
      id: '002',
      title: 'Computador não liga',
      description: 'Desktop do setor financeiro não está ligando. LED da fonte pisca mas não há resposta.',
      priority: 'Média',
      status: 'Em Andamento',
      equipment: 'Dell OptiPlex 3070',
      requester: 'João Silva',
      createdAt: new Date('2024-10-09T11:15:00'),
      lastModified: new Date('2024-10-10T16:45:00'),
      lastChange: 'Verificação da fonte de alimentação'
    },
    {
      id: '003',
      title: 'Monitor com tela piscando',
      description: 'Monitor do usuário apresenta intermitência na imagem, principalmente ao ligar.',
      priority: 'Baixa',
      status: 'Pendente',
      equipment: 'LG UltraWide 29WP60G',
      requester: 'Ana Costa',
      createdAt: new Date('2024-10-07T15:45:00'),
      lastModified: new Date('2024-10-09T10:30:00'),
      lastChange: 'Ajuste de configurações de vídeo'
    },
    {
      id: '004',
      title: 'Notebook com superaquecimento',
      description: 'Laptop apresenta temperatura elevada e desligamentos inesperados durante uso intenso.',
      priority: 'Alta',
      status: 'Resolvido',
      equipment: 'Lenovo ThinkPad E14',
      requester: 'Pedro Oliveira',
      createdAt: new Date('2024-10-05T13:20:00'),
      lastModified: new Date('2024-10-08T09:15:00'),
      lastChange: 'Limpeza do sistema de refrigeração'
    }
  ];

  ngOnInit() {
    this.loadTickets();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  ngAfterViewInit() {
    // Selecionar o primeiro ticket por padrão se houver tickets
    if (this.tickets.length > 0 && !this.selectedTicket) {
      this.selectTicket(this.tickets[0]);
    }
  }

  // === MÉTODOS DE NAVEGAÇÃO E FILTROS ===
  openFilters() {
    this.announceAction('Abrindo filtros de chamados');
    // Implementar modal de filtros
  }

  createNewTicket() {
    this.announceAction('Abrindo formulário de novo chamado');
    this.router.navigate(['/chamados/novo']);
  }

  clearFilters() {
    this.announceAction('Filtros limpos');
    this.showToast('Filtros removidos com sucesso', 'success');
  }

  // === MÉTODOS DE VISUALIZAÇÃO ===
  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.announceAction(`Modo de visualização alterado para ${mode === 'list' ? 'lista' : 'grade'}`);
  }

  selectTicket(ticket: Ticket) {
    this.selectedTicket = ticket;
    this.announceAction(`Chamado ${ticket.id} selecionado: ${ticket.title}`);
    
    // Gerar QR Code após um pequeno delay para garantir que o canvas esteja disponível
    setTimeout(() => {
      this.generateQRCode();
    }, 100);
  }

  editTicket(ticket: Ticket) {
    this.announceAction(`Editando chamado ${ticket.id}`);
    this.router.navigate(['/chamados', ticket.id, 'editar']);
  }

  openTicketMenu(ticket: Ticket) {
    this.announceAction(`Abrindo menu do chamado ${ticket.id}`);
    // Implementar menu contextual
  }

  trackTicket(index: number, ticket: Ticket): string {
    return ticket.id;
  }

  // === MÉTODOS DO QR CODE ===
  async generateQRCode() {
    if (!this.selectedTicket || !this.qrCanvas) {
      return;
    }

    this.isGeneratingQR = true;

    try {
      const qrData = this.buildQRData(this.selectedTicket);
      const canvas = this.qrCanvas.nativeElement;
      
      await QRCode.toCanvas(canvas, qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      this.announceAction(`QR Code gerado para o chamado ${this.selectedTicket.id}`);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      this.showToast('Erro ao gerar QR Code', 'error');
    } finally {
      this.isGeneratingQR = false;
    }
  }

  regenerateQRCode() {
    this.announceAction('Regenerando QR Code');
    this.generateQRCode();
  }

  printQRCode() {
    if (!this.selectedTicket) {
      this.showToast('Nenhum chamado selecionado', 'error');
      return;
    }

    this.announceAction(`Imprimindo QR Code do chamado ${this.selectedTicket.id}`);
    
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showToast('Erro ao abrir janela de impressão', 'error');
      return;
    }

    const canvas = this.qrCanvas.nativeElement;
    const dataUrl = canvas.toDataURL('image/png');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - Chamado #${this.selectedTicket.id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px; 
            }
            .qr-label { 
              margin-bottom: 20px; 
              font-size: 18px; 
              font-weight: bold; 
            }
            .qr-info { 
              margin-top: 20px; 
              font-size: 14px; 
              text-align: left; 
              max-width: 400px; 
              margin-left: auto; 
              margin-right: auto; 
            }
            .info-item { 
              margin-bottom: 8px; 
            }
            .info-label { 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="qr-label">Chamado #${this.selectedTicket.id}</div>
          <img src="${dataUrl}" alt="QR Code do Chamado ${this.selectedTicket.id}">
          <div class="qr-info">
            <div class="info-item">
              <span class="info-label">Título:</span> ${this.selectedTicket.title}
            </div>
            <div class="info-item">
              <span class="info-label">Equipamento:</span> ${this.selectedTicket.equipment}
            </div>
            <div class="info-item">
              <span class="info-label">Data de Modificação:</span> ${this.datePipe.transform(this.selectedTicket.lastModified, 'dd/MM/yyyy HH:mm')}
            </div>
            <div class="info-item">
              <span class="info-label">Última Alteração:</span> ${this.selectedTicket.lastChange}
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Aguardar o carregamento da imagem antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);

    this.showToast('QR Code enviado para impressão', 'success');
  }

  downloadQRCode() {
    if (!this.selectedTicket) {
      this.showToast('Nenhum chamado selecionado', 'error');
      return;
    }

    this.announceAction(`Baixando QR Code do chamado ${this.selectedTicket.id}`);
    
    const canvas = this.qrCanvas.nativeElement;
    const dataUrl = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `qr-code-chamado-${this.selectedTicket.id}.png`;
    link.href = dataUrl;
    link.click();

    this.showToast('QR Code baixado com sucesso', 'success');
  }

  async copyQRData() {
    if (!this.selectedTicket) {
      this.showToast('Nenhum chamado selecionado', 'error');
      return;
    }

    const qrData = this.buildQRData(this.selectedTicket);
    
    try {
      await navigator.clipboard.writeText(qrData);
      this.showToast('Dados do QR Code copiados', 'success');
      this.announceAction('Dados do QR Code copiados para a área de transferência');
    } catch (error) {
      console.error('Erro ao copiar dados:', error);
      this.showToast('Erro ao copiar dados', 'error');
    }
  }

  // === MÉTODOS AUXILIARES ===
  private buildQRData(ticket: Ticket): string {
    const qrData = {
      id: ticket.id,
      title: ticket.title,
      equipment: ticket.equipment,
      lastModified: this.datePipe.transform(ticket.lastModified, 'dd/MM/yyyy HH:mm'),
      lastChange: ticket.lastChange,
      url: `${window.location.origin}/chamados/${ticket.id}`
    };

    return JSON.stringify(qrData);
  }

  private loadTickets() {
    // Simular carregamento de dados
    this.announceAction(`${this.tickets.length} chamados carregados`);
  }

  private setupKeyboardShortcuts() {
    // Implementar atalhos de teclado para navegação rápida
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'n':
            event.preventDefault();
            this.createNewTicket();
            break;
          case 'f':
            event.preventDefault();
            this.openFilters();
            break;
          case 'p':
            if (this.selectedTicket) {
              event.preventDefault();
              this.printQRCode();
            }
            break;
        }
      }
    });
  }

  // === MÉTODOS DE TOAST ===
  private showToast(message: string, type: ToastType) {
    this.toastMessage = message;
    this.toastType = type;
    
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastTimeout = window.setTimeout(() => {
      this.closeToast();
    }, 4000);
  }

  closeToast() {
    this.toastMessage = '';
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = undefined;
    }
  }

  // === MÉTODOS DE ACESSIBILIDADE ===
  private announceAction(message: string) {
    const announcer = document.getElementById('status-announcements');
    if (announcer) {
      announcer.textContent = message;
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  }
}
