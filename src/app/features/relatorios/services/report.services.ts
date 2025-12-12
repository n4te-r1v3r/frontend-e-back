import { inject, Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, where, Query, Timestamp } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
// ⭐ CORREÇÃO 1: Ajuste o caminho para a sua estrutura (features/relatorios/components/relatorios.component.ts)
import { ReportData, ReportStat } from '../components/relatorios.component'; 

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private firestore = inject(Firestore);

  /**
   * Mapeia os valores de filtro da UI para os valores reais no Firestore.
   */
  private mapStatusToFirestore(status: string): string {
    switch (status) {
      case 'all': return 'all';
      case 'active': return 'Aberto';
      case 'pending': return 'Pendente';
      case 'completed': return 'Concluído';
      case 'inactive': return 'Fechado'; 
      default: return status;
    }
  }

  /**
   * Constrói uma Query Firestore baseada nos filtros.
   */
  private buildQuery(
    reportType: string, 
    dateRange: string, 
    status: string, 
    department: string
  ): Query<ReportData> {
    
    const collectionRef = collection(this.firestore, reportType) as any;
    let q: Query<ReportData> = collectionRef;

    // 2. Aplica filtro de Status
    const firestoreStatus = this.mapStatusToFirestore(status);
    if (firestoreStatus !== 'all' && firestoreStatus !== '') {
      q = query(q, where('status', '==', firestoreStatus));
    }

    // 3. Aplica filtro de Departamento
    if (department !== 'all' && department !== '') {
      q = query(q, where('department', '==', department.toUpperCase()));
    }

    // 4. Aplica filtro de Data (Intervalo)
    const dateLimits = this.calculateDateRange(dateRange);
    if (dateLimits.start) {
        q = query(q, where('date', '>=', dateLimits.start));
    }
    if (dateLimits.end) {
        q = query(q, where('date', '<=', dateLimits.end));
    }
    
    return q;
  }
  
  /**
   * Calcula os limites de data (start/end) com base na seleção do usuário (range).
   */
  private calculateDateRange(range: string): { start: Timestamp | null, end: Timestamp | null } {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (range) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay(); 
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
      default:
        end = null; 
        start = null;
    }

    // ⭐ CORREÇÃO 2: Garante o retorno do objeto com os tipos corretos
    return { 
        start: start ? Timestamp.fromDate(start) : null, 
        end: end ? Timestamp.fromDate(end) : null 
    };
  }

  /**
   * Busca os dados do relatório do Firestore, aplicando filtros.
   */
  getReportData(reportType: string, dateRange: string, status: string, department: string): Observable<ReportData[]> {
    const q = this.buildQuery(reportType, dateRange, status, department);
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(data => data as ReportData[])
    );
  }

  /**
   * Calcula estatísticas (feita no frontend com base nos dados filtrados).
   */
  calculateReportStats(data: ReportData[]): ReportStat[] {
    const total = data.length;
    const abertos = data.filter(item => item.status === 'Aberto').length;
    const pendentes = data.filter(item => item.status === 'Pendente').length;
    const concluidos = data.filter(item => item.status === 'Concluído').length;
    
    return [
      { type: 'total', label: 'Total de Registros', value: total, trend: { type: 'up', value: '12', suffix: '%' } },
      { type: 'active', label: 'Abertos', value: abertos, trend: { type: 'up', value: '8', suffix: '%' } },
      { type: 'pending', label: 'Pendentes', value: pendentes, trend: { type: 'down', value: '5', suffix: '%' } },
      { type: 'completed', label: 'Concluídos', value: concluidos, trend: { type: 'up', value: '15', suffix: '%' } }
    ];
  }
}