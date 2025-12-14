import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ReportService } from '../services/report.services'; 

export interface ReportStat {
  type: string;
  label: string;
  value: number;
  trend: {
    type: 'up' | 'down' | 'stable';
    value: string;
    suffix: string;
  };
}

export interface ReportData {
  id: string;
  title?: string;
  name?: string;
  status: string;
  date: Date | { toDate: () => Date };
  responsible: string;
  department: string;
  type: string;
  priority?: string;
  [key: string]: any;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
}

export interface ExportSettings {
  includeHeaders: boolean;
  includeFilters: boolean;
}

type ViewMode = 'table' | 'cards';
type ToastType = 'success' | 'error' | 'info';
type SortDirection = 'asc' | 'desc' | null;

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.scss'
})
export class RelatoriosComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private reportService = inject(ReportService);
  private destroy$ = new Subject<void>();

  // Estado da aplicação
  viewMode: ViewMode = 'table';
  selectedDateRange = 'month';
  selectedReportType = 'tickets';
  selectedStatus = 'all';
  selectedDepartment = 'all';
  
  // Controle de filtros avançados
  showAdvancedFilters = false;
  
  // Ordenação
  sortColumn = 'date';
  sortDirection: SortDirection = 'desc';
  
  // Toast notifications
  toastMessage = '';
  toastType: ToastType = 'info';
  private toastTimeout?: number;

  exportSettings: ExportSettings = {
    includeHeaders: true,
    includeFilters: true
  };

  tableColumns: TableColumn[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'title', label: 'Título', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'date', label: 'Data', sortable: true },
    { key: 'responsible', label: 'Responsável', sortable: true },
    { key: 'department', label: 'Departamento', sortable: true }
  ];

  reportStats: ReportStat[] = [];
  reportData: ReportData[] = [];

  ngOnInit() {
    this.updateTableColumns();
    this.applyFilters();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  // === NOVOS MÉTODOS ===
  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    this.announceAction(`Filtros avançados ${this.showAdvancedFilters ? 'expandidos' : 'recolhidos'}`);
  }

  // === MÉTODOS DE NAVEGAÇÃO ===
  openSettings() {
    this.announceAction('Abrindo configurações de relatórios');
  }

  generateNewReport() {
    this.announceAction('Gerando novo relatório');
    this.router.navigate(['/relatorios/novo']);
  }

  // === MÉTODOS DE FILTROS ===
  onDateRangeChange() {
    this.announceAction(`Período alterado para ${this.getDateRangeLabel()}`);
    this.applyFilters();
  }

  onReportTypeChange() {
    this.announceAction(`Tipo de relatório alterado para ${this.getReportTypeLabel()}`);
    this.updateTableColumns();
    this.applyFilters();
  }

  onStatusChange() {
    this.announceAction(`Filtro de status alterado para ${this.getStatusLabel()}`);
    this.applyFilters();
  }

  onDepartmentChange() {
    this.announceAction(`Filtro de departamento alterado para ${this.getDepartmentLabel()}`);
    this.applyFilters();
  }

  clearFilters() {
    this.announceAction('Limpando filtros');
  }

  resetFilters() {
    this.selectedDateRange = 'month';
    this.selectedReportType = 'tickets';
    this.selectedStatus = 'all';
    this.selectedDepartment = 'all';
    this.updateTableColumns();
    this.applyFilters();
    this.showToast('Filtros resetados', 'success');
  }

  applyFilters() {
    this.announceAction('Aplicando filtros ao relatório');
    this.loadReportData();
    this.showToast('Filtros aplicados com sucesso', 'success');
  }

  // === MÉTODOS DE VISUALIZAÇÃO ===
  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.announceAction(`Modo de visualização alterado para ${mode === 'table' ? 'tabela' : 'cards'}`);
  }

  // === MÉTODOS DE ORDENAÇÃO ===
  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : this.sortDirection === 'desc' ? null : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    if (this.sortDirection && this.reportData.length > 0) {
      this.reportData.sort((a, b) => {
        const aValue = this.getRawValue(a, column);
        const bValue = this.getRawValue(b, column);
        
        let comparison = 0;
        if (aValue > bValue) comparison = 1;
        if (aValue < bValue) comparison = -1;
        
        return this.sortDirection === 'desc' ? -comparison : comparison;
      });
    } else {
      if (this.reportData.length > 0) {
        this.loadReportData(); 
      }
    }

    this.announceAction(`Dados ordenados por ${column} ${this.getSortDirectionLabel()}`);
  }
  
  private getRawValue(item: ReportData, column: string): any {
      let value = item[column];
      
      if (value && typeof value.toDate === 'function') {
          return value.toDate();
      }
      return value;
  }

  getSortDirection(column: string): string {
    if (this.sortColumn !== column) return 'none';
    if (this.sortDirection === 'asc') return 'ascending';
    if (this.sortDirection === 'desc') return 'descending';
    return 'none';
  }

  // === MÉTODOS DE DADOS ===
  private loadReportData() {
    const { selectedReportType, selectedDateRange, selectedStatus, selectedDepartment } = this;

    this.reportService.getReportData(selectedReportType, selectedDateRange, selectedStatus, selectedDepartment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reportData = data;
          this.reportStats = this.reportService.calculateReportStats(data);
          this.sortBy(this.sortColumn); 
          this.announceAction(`Relatório carregado: ${data.length} registros`);
        },
        error: (err) => {
          console.error('Erro ao carregar dados do Firebase:', err);
          this.showToast('Erro ao carregar relatório. Verifique sua conexão e permissões.', 'error');
          this.reportData = [];
          this.reportStats = [];
        }
      });
  }

  selectItem(item: ReportData) {
    this.announceAction(`Item selecionado: ${item.title || item.name || item.id}`);
    this.router.navigate(['/relatorios', item.id]);
  }

  refreshStats() {
    this.announceAction('Atualizando estatísticas');
    this.loadReportData();
    this.showToast('Estatísticas atualizadas', 'success');
  }

  getColumnValue(item: ReportData, column: string): any {
    let value = item[column];
    
    if (column === 'date') {
      if (value && typeof value.toDate === 'function') {
          value = value.toDate();
      }
      if (value instanceof Date) {
        return this.datePipe.transform(value, 'dd/MM/yyyy HH:mm');
      }
    }
    return value || '-';
  }

  // === MÉTODOS DE EXPORTAÇÃO ===
  exportToPDF() {
    this.announceAction('Exportando relatório para PDF');
    this.simulateExport('PDF');
  }

  exportToExcel() {
    this.announceAction('Exportando relatório para Excel');
    this.simulateExport('Excel');
  }

  exportToCSV() {
    this.announceAction('Exportando relatório para CSV');
    this.simulateExport('CSV');
  }

  exportToJSON() {
    this.announceAction('Exportando relatório para JSON');
    this.simulateExport('JSON');
  }

  private simulateExport(format: string) {
    if (this.reportData.length === 0) {
      this.showToast('Nenhum dado para exportar.', 'error');
      return;
    }

    setTimeout(() => {
      this.showToast(`Relatório exportado para ${format} com sucesso`, 'success');
    }, 1500);
  }

  // === MÉTODOS AUXILIARES ===
  private updateTableColumns() {
    switch (this.selectedReportType) {
      case 'tickets':
        this.tableColumns = [
          { key: 'id', label: 'ID', sortable: true },
          { key: 'title', label: 'Título', sortable: true },
          { key: 'priority', label: 'Prioridade', sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'date', label: 'Data', sortable: true },
          { key: 'responsible', label: 'Responsável', sortable: true }
        ];
        break;
      case 'assets':
        this.tableColumns = [
          { key: 'id', label: 'Patrimônio', sortable: true },
          { key: 'name', label: 'Nome', sortable: true },
          { key: 'type', label: 'Tipo', sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'department', label: 'Departamento', sortable: true },
          { key: 'responsible', label: 'Responsável', sortable: true }
        ];
        break;
      default:
        this.tableColumns = [
          { key: 'id', label: 'ID', sortable: true },
          { key: 'title', label: 'Título', sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'date', label: 'Data', sortable: true },
          { key: 'responsible', label: 'Responsável', sortable: true }
        ];
    }
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'e':
            event.preventDefault();
            this.exportToPDF();
            break;
          case 'r':
            event.preventDefault();
            this.refreshStats();
            break;
          case 'f':
            event.preventDefault();
            this.resetFilters();
            break;
        }
      }
    });
  }

  // === MÉTODOS DE LABELS ===
  getStatsSubtitle(): string {
    return `${this.getDateRangeLabel()} • ${this.getReportTypeLabel()}`;
  }

  private getDateRangeLabel(): string {
    const labels: { [key: string]: string } = {
      'today': 'Hoje',
      'week': 'Esta Semana',
      'month': 'Este Mês',
      'quarter': 'Este Trimestre',
      'year': 'Este Ano',
      'custom': 'Personalizado'
    };
    return labels[this.selectedDateRange] || 'Período';
  }

  private getReportTypeLabel(): string {
    const labels: { [key: string]: string } = {
      'tickets': 'Chamados',
      'assets': 'Ativos',
      'maintenance': 'Manutenções',
      'performance': 'Performance',
      'users': 'Usuários'
    };
    return labels[this.selectedReportType] || 'Tipo';
  }

  private getStatusLabel(): string {
    const labels: { [key: string]: string } = {
      'all': 'Todos',
      'active': 'Aberto',
      'inactive': 'Fechado',
      'pending': 'Pendente',
      'completed': 'Concluído'
    };
    return labels[this.selectedStatus] || 'Status';
  }

  private getDepartmentLabel(): string {
    const labels: { [key: string]: string } = {
      'all': 'Todos',
      'ti': 'TI',
      'rh': 'RH',
      'financeiro': 'Financeiro',
      'operacoes': 'Operações'
    };
    return labels[this.selectedDepartment] || 'Departamento';
  }

  private getSortDirectionLabel(): string {
    if (this.sortDirection === 'asc') return 'crescente';
    if (this.sortDirection === 'desc') return 'decrescente';
    return 'sem ordenação';
  }

  // === MÉTODOS DE TEMPLATE ===
  getCardColumns(): TableColumn[] {
    return this.tableColumns.slice(1, 4); 
  }

  getRowAriaLabel(item: ReportData): string {
    return `${item.title || item.name || item.id}, Status: ${item.status}, Data: ${this.getColumnValue(item, 'date')}`;
  }

  getCardAriaLabel(item: ReportData): string {
    return `Card do item ${item.title || item.name || item.id}, Status: ${item.status}`;
  }

  getStatIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'total': 'M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z',
      'active': 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z',
      'pending': 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,6A1.5,1.5 0 0,1 13.5,7.5A1.5,1.5 0 0,1 12,9A1.5,1.5 0 0,1 10.5,7.5A1.5,1.5 0 0,1 12,6M12,17C9.5,17 7.5,15 7.5,12.5C7.5,11.77 7.64,11.07 7.87,10.43L10.46,13.02C11.07,13.63 11.94,14 12.94,14C14.08,14 15.09,13.47 15.71,12.64L18.29,15.22C17.65,16.36 16.64,17.28 15.36,17.78C14.28,18.22 13.16,18.44 12,18.44V17Z',
      'completed': 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z'
    };
    return icons[type] || icons['total'];
  }

  getTrendIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'up': 'M15,20H9V12H4.16L12,4.16L19.84,12H15V20Z',
      'down': 'M9,4H15V12H19.84L12,19.84L4.16,12H9V4Z',
      'stable': 'M5,13H19V11H5V13Z'
    };
    return icons[type] || icons['stable'];
  }

  // === MÉTODOS DE TRACKING ===
  trackStat(index: number, stat: ReportStat): string {
    return stat.type;
  }

  trackColumn(index: number, column: TableColumn): string {
    return column.key;
  }

  trackReportItem(index: number, item: ReportData): string {
    return item.id;
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