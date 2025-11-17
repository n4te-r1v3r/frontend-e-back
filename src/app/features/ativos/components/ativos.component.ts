import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { FirestoreService, Asset, MaintenanceRecord } from '../../../services/firestore.service'; // Ajuste o caminho se necessário

// Remova as definições de Asset e MaintenanceRecord daqui, pois elas já estão no FirestoreService

interface Specification {
  label: string;
  value: string;
}

type ViewMode = 'list' | 'grid';
type ToastType = 'success' | 'error' | 'info';

@Component({
  selector: 'app-ativos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './ativos.component.html',
  styleUrl: './ativos.component.scss',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: 0 }),
        animate('300ms ease-in-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ height: '0', opacity: 0 }))
      ])
    ])
  ]
})
export class AtivosComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private firestoreService = inject(FirestoreService);
  private destroy$ = new Subject<void>();

  viewMode: ViewMode = 'list';
  selectedAsset: Asset | null = null;
  showAdvancedFilters = false;

  searchTerm = '';
  selectedCategory = 'all';
  selectedStatus = 'all';
  selectedLocation = 'all';
  selectedResponsible = 'all';

  toastMessage = '';
  toastType: ToastType = 'info';
  private toastTimeout?: number;

  assets: Asset[] = [];
  filteredAssets: Asset[] = [];
  totalAssetsCount: number = 0;

  ngOnInit() {
    this.loadAssets();
    this.setupKeyboardShortcuts();
    this.loadTotalAssetsCount();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  // --- MÉTODOS DE NAVEGAÇÃO ---
  importAssets() {
    this.announceAction('Abrindo importação de ativos');
    this.router.navigate(['/ativos/importar']);
  }

  createNewAsset() {
    this.announceAction('Abrindo formulário de novo ativo');
    this.router.navigate(['/ativos/novo']);
  }

  exportAssets() {
    this.announceAction('Exportando lista de ativos');
    this.showToast('Funcionalidade de exportação em desenvolvimento', 'info');
  }

  // --- MÉTODOS DE BUSCA E FILTROS ---
  onSearchChange() {
    this.applyFilters();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }

  setCategory(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
    this.announceAction(`Categoria alterada para ${this.getCategoryLabel(category)}`);
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    this.announceAction(`Filtros avançados ${this.showAdvancedFilters ? 'abertos' : 'fechados'}`);
  }

  onFiltersChange() {
    this.applyFilters();
  }

  clearAllFilters() {
    this.searchTerm = '';
    this.selectedCategory = 'all';
    this.selectedStatus = 'all';
    this.selectedLocation = 'all';
    this.selectedResponsible = 'all';
    this.applyFilters();
    this.showToast('Filtros limpos', 'success');
  }

  private applyFilters() {
    this.filteredAssets = this.assets.filter(asset => {
      const searchMatch = !this.searchTerm ||
        asset.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        asset.serialNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (asset.patrimony && asset.patrimony.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        asset.type.toLowerCase().includes(this.searchTerm.toLowerCase());

      const categoryMatch = this.selectedCategory === 'all' || asset.category === this.selectedCategory;

      const statusMatch = this.selectedStatus === 'all' || asset.status.toLowerCase() === this.selectedStatus.toLowerCase();

      const locationMatch = this.selectedLocation === 'all' || asset.location.toLowerCase() === this.selectedLocation.toLowerCase();

      const responsibleMatch = this.selectedResponsible === 'all' ||
        asset.responsible.toLowerCase().replace(' ', '-') === this.selectedResponsible.toLowerCase();

      return searchMatch && categoryMatch && statusMatch && locationMatch && responsibleMatch;
    });

    this.announceAction(`${this.filteredAssets.length} ativos encontrados`);
  }

  // --- MÉTODOS DE VISUALIZAÇÃO ---
  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.announceAction(`Modo de visualização alterado para ${mode === 'list' ? 'lista' : 'grade'}`);
  }

  selectAsset(asset: Asset) {
    this.selectedAsset = asset;
    this.announceAction(`Ativo selecionado: ${asset.name}`);
  }

  closeDetails() {
    this.selectedAsset = null;
    this.announceAction('Detalhes fechados');
  }

  editAsset(asset: Asset) {
    this.announceAction(`Editando ativo ${asset.name}`);
    this.router.navigate(['/ativos', asset.id, 'editar']);
  }

  async openAssetMenu(asset: Asset) {
    this.announceAction(`Abrindo menu do ativo ${asset.name}`);
    if (confirm(`Tem certeza que deseja deletar o ativo ${asset.name}? Esta ação é irreversível.`)) {
      try {
        await this.firestoreService.deleteAsset(asset.id!);
        this.showToast('Ativo deletado com sucesso!', 'success');
        this.closeDetails();
      } catch (error) {
        console.error("Erro ao deletar ativo:", error);
        this.showToast('Erro ao deletar ativo.', 'error');
      }
    }
  }

  // --- MÉTODOS DE AÇÕES ---
  async assignAsset(asset: Asset) {
    this.announceAction(`Atribuindo ativo ${asset.name}`);
    const newResponsible = prompt(`Novo responsável para ${asset.name}:`);
    if (newResponsible) {
      const updatedAsset = { ...asset, responsible: newResponsible };
      try {
        await this.firestoreService.updateAsset(updatedAsset);
        this.showToast('Responsável atualizado com sucesso!', 'success');
        this.selectedAsset = updatedAsset;
      } catch (error) {
        console.error("Erro ao atribuir ativo:", error);
        this.showToast('Erro ao atribuir ativo.', 'error');
      }
    }
  }

  scheduleMaintenance(asset: Asset) {
    this.announceAction(`Agendando manutenção para ${asset.name}`);
    this.showToast('Funcionalidade de agendamento em desenvolvimento', 'info');
  }

  changeStatus(asset: Asset) {
    this.announceAction(`Alterando status do ativo ${asset.name}`);
    this.showToast('Funcionalidade de alteração de status em desenvolvimento', 'info');
  }

  generateReport(asset: Asset) {
    this.announceAction(`Gerando relatório do ativo ${asset.name}`);
    this.showToast('Relatório gerado com sucesso', 'success');
  }

  // --- MÉTODOS AUXILIARES ---
  private loadAssets() {
    this.firestoreService.getAssets()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assetsFromFirestore) => {
          this.assets = assetsFromFirestore;
          this.applyFilters();
          this.announceAction(`${this.assets.length} ativos carregados do Firestore`);
        },
        error: (error) => {
          console.error("Erro ao carregar ativos do Firestore:", error);
          this.showToast('Erro ao carregar ativos. Verifique o console.', 'error');
        }
      });
  }

  private loadTotalAssetsCount() {
    this.firestoreService.getTotalAssetsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          this.totalAssetsCount = count;
        },
        error: (error) => {
          console.error("Erro ao carregar contagem total de ativos:", error);
        }
      });
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'n':
            event.preventDefault();
            this.createNewAsset();
            break;
          case 'f':
            event.preventDefault();
            this.toggleAdvancedFilters();
            break;
          case 'e':
            event.preventDefault();
            this.exportAssets();
            break;
        }
      }
    });
  }

  // --- MÉTODOS DE CONTAGEM ---
  getTotalCount(): number {
    return this.totalAssetsCount;
  }

  getCategoryCount(category: string): number {
    return this.assets.filter(asset => asset.category === category).length;
  }

  // --- MÉTODOS DE LABELS ---
  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'all': 'Todos', 'computers': 'Computadores', 'printers': 'Impressoras',
      'monitors': 'Monitores', 'accessories': 'Acessórios'
    };
    return labels[category] || category;
  }

  getAssetAriaLabel(asset: Asset): string {
    return `${asset.name}, Patrimônio ${asset.patrimony}, Status: ${asset.status}, Localização: ${asset.location}`;
  }

  getAssetIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'computers': 'M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z',
      'printers': 'M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z',
      'monitors': 'M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z',
      'accessories': 'M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z'
    };
    return icons[category] || icons['computers'];
  }

  getSpecifications(specs: { [key: string]: any }): Specification[] {
    if (!specs) return [];
    return Object.entries(specs).map(([key, value]) => ({
      label: this.getSpecLabel(key),
      value: value.toString()
    }));
  }

  private getSpecLabel(key: string): string {
    const labels: { [key: string]: string } = {
      'processor': 'Processador', 'memory': 'Memória', 'storage': 'Armazenamento', 'graphics': 'Placa de Vídeo', 'screen': 'Tela',
      'type': 'Tipo', 'speed': 'Velocidade', 'resolution': 'Resolução', 'connectivity': 'Conectividade', 'paper': 'Papel',
      'size': 'Tamanho', 'panel': 'Painel', 'refresh': 'Taxa de Atualização', 'switches': 'Switches', 'layout': 'Layout',
      'backlight': 'Iluminação', 'dpi': 'DPI', 'battery': 'Bateria', 'buttons': 'Botões', 'ports': 'Portas'
    };
    return labels[key] || key;
  }

  trackAsset(index: number, asset: Asset): string {
    return asset.id || index.toString();
  }

  trackMaintenance(index: number, maintenance: MaintenanceRecord): string {
    return maintenance.id || index.toString();
  }

  private showToast(message: string, type: ToastType) {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) { clearTimeout(this.toastTimeout); }
    this.toastTimeout = window.setTimeout(() => { this.closeToast(); }, 4000);
  }

  closeToast() {
    this.toastMessage = '';
    if (this.toastTimeout) { clearTimeout(this.toastTimeout); this.toastTimeout = undefined; }
  }

  private announceAction(message: string) {
    const announcer = document.getElementById('status-announcements');
    if (announcer) {
      announcer.textContent = message;
      setTimeout(() => { announcer.textContent = ''; }, 1000);
    }
  }
}
