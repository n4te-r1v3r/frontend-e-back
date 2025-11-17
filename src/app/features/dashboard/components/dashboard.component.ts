import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, combineLatest, map, Observable, takeUntil } from 'rxjs';

// Importações do Firebase Auth e Firestore
import { Auth, User as FirebaseAuthUser, authState } from '@angular/fire/auth';
import { Firestore, collection, collectionData, doc, docData, query, orderBy, limit, where } from '@angular/fire/firestore';


// -- Interfaces de Dados --
interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface ChartData {
  label: string;
  value: number; // Altura da barra (porcentagem de conclusão ou total)
  count: number; // Total de chamados no dia
  colorClass: string; // Classe CSS para a cor da barra
}

interface Ticket {
  id: string;
  title: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  author: string; // Nome do autor, que pode vir de um UID
  timeAgo: string; // Calculado no frontend
  status: string; // 'Aberto', 'Em andamento', 'Resolvido', 'Pendente', 'Em atraso'
  createdAt: any; // Firestore Timestamp, será convertido para Date
  dueDate?: any; // NOVO: Firestore Timestamp, data limite para conclusão
  resolvedAt?: any; // Firestore Timestamp, data de resolução (se 'Resolvido')
}

interface Asset {
  id: string;
  name: string;
  type: string;
  status: 'Ativo' | 'Inativo' | 'Manutenção';
  lastUpdate: string; // Calculado no frontend, usando createdAt
  createdAt: any; // Firestore Timestamp, será convertido para Date
}


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  private auth = inject(Auth);         // Injeta o serviço Auth
  private firestore = inject(Firestore); // Injeta o serviço Firestore

  // Usuário ativo
  currentUser: User | null = null;
  firebaseUser: FirebaseAuthUser | null = null;

  isUserOnline = true; // Placeholder, para uma futura integração com Realtime DB

  // Métricas dinâmicas
  totalAssets = 0;
  activeTickets = 0;
  activeUsers = 0;

  // Dados do gráfico
  chartData: ChartData[] = [];

  // Tooltip do gráfico
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipData: ChartData | null = null;

  // Tickets recentes
  recentTickets: Ticket[] = [];

  // Assets recentes
  recentAssets: Asset[] = [];

  // Estado de carregamento da dashboard
  isLoadingDashboard = true;

  ngOnInit() {
    this.listenToAuthChanges(); // Inicia o monitoramento da autenticação
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Métodos de Navegação ---
  navigateToAssets() {
    this.announceAction('Navegando para página de Assets');
    this.router.navigate(['/ativos']);
  }

  navigateToTickets() {
    this.announceAction('Navegando para página de Tickets');
    this.router.navigate(['/chamados']);
  }

  // --- Métodos do Usuário ---
  getUserInitials(): string {
    if (this.currentUser && this.currentUser.name) {
      return this.currentUser.name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return '??'; // Default se o nome não estiver disponível
  }

  // --- Métodos do Gráfico ---
  showTooltip(event: MouseEvent, data: ChartData) {
    this.tooltipVisible = true;
    this.tooltipX = event.clientX + 10;
    this.tooltipY = event.clientY - 30;
    this.tooltipData = data;
  }

  hideTooltip() {
    this.tooltipVisible = false;
    this.tooltipData = null;
  }

  openChartFilters() {
    this.announceAction('Abrindo filtros do gráfico');
    // Implementar modal de filtros
  }

  openChartOptions() {
    this.announceAction('Abrindo opções do gráfico');
    // Implementar menu de opções
  }

  // --- Métodos dos Tickets ---
  openTicket(ticketId: string) {
    this.announceAction(`Abrindo ticket ${ticketId}`);
    this.router.navigate(['/chamados', ticketId]);
  }

  openTicketMenu(ticketId: string) {
    this.announceAction(`Abrindo menu do ticket ${ticketId}`);
    // Implementar menu contextual
  }

  trackTicket(index: number, ticket: Ticket): string {
    return ticket.id;
  }

  // --- Métodos dos Assets ---
  openAsset(assetId: string) {
    this.announceAction(`Abrindo asset ${assetId}`);
    this.router.navigate(['/ativos', assetId]);
  }

  openAssetMenu(assetId: string) {
    this.announceAction(`Abrindo menu do asset ${assetId}`);
    // Implementar menu contextual
  }

  trackAsset(index: number, asset: Asset): string {
    return asset.id;
  }

  getAssetIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Servidor': 'M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17Z',
      'Banco de Dados': 'M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13C7.58,13 4,11.21 4,9M4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18C7.58,18 4,16.21 4,14Z',
      'Rede': 'M4,1C2.89,1 2,1.89 2,3V7C2,8.11 2.89,9 4,9H1V11H13V9H10C11.11,9 12,8.11 12,7V3C12,1.89 11.11,1 10,1H4M4,3H10V7H4V3Z',
      'Notebook': 'M2,4H22V16H2M22,18A2,2 0 0,0 24,16V4C24,2.89 23.1,2 22,2H2C0.89,2 0,2.89 0,4V16A2,2 0 0,0 2,18H0V20H24V18H2Z'
    };
    return icons[type] || icons['Servidor'];
  }

  // --- Central de Conexão com Firebase ---
  private listenToAuthChanges(): void {
    authState(this.auth).pipe(
      takeUntil(this.destroy$)
    ).subscribe(firebaseUser => {
      this.firebaseUser = firebaseUser;
      if (firebaseUser) {
        this.fetchCurrentUserProfile(firebaseUser.uid);
        this.loadDynamicDashboardData();
      } else {
        this.currentUser = null;
        this.isLoadingDashboard = false;
        this.router.navigate(['/login']);
      }
    });
  }

  private fetchCurrentUserProfile(uid: string): void {
    const userDoc = doc(this.firestore, `users/${uid}`);
    docData(userDoc).pipe(
      map(data => {
        if (data) {
          return {
            uid: uid,
            name: (data['nome'] + ' ' + data['sobrenome']) || 'Usuário Desconhecido',
            email: data['email'] || '',
            role: data['cargo'] || 'Usuário',
            avatar: data['avatar'] || undefined
          } as User;
        }
        return null;
      }),
      takeUntil(this.destroy$)
    ).subscribe(userProfile => {
      this.currentUser = userProfile;
    });
  }

  private loadDynamicDashboardData(): void {
    this.isLoadingDashboard = true;
    combineLatest([
      this.getMetrics(),
      this.getRecentTickets(),
      this.getRecentAssets(),
      this.getChartData()
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([metrics, tickets, assets, chartData]) => {
      this.totalAssets = metrics.totalAssets;
      this.activeTickets = metrics.activeTickets;
      this.activeUsers = metrics.activeUsers;
      this.recentTickets = tickets;
      this.recentAssets = assets;
      this.chartData = chartData;
      this.isLoadingDashboard = false;
      this.announceAction('Dashboard carregado com sucesso');
    }, error => {
      console.error('Erro ao carregar dados do dashboard:', error);
      this.isLoadingDashboard = false;
      this.announceAction('Erro ao carregar dashboard');
    });
  }

  private getMetrics(): Observable<{ totalAssets: number, activeTickets: number, activeUsers: number }> {
    const assetsCollection = collection(this.firestore, 'ativos');
    const ticketsCollection = collection(this.firestore, 'chamados');
    const usersCollection = collection(this.firestore, 'users');

    return combineLatest([
      collectionData(assetsCollection).pipe(map(data => data.length)),
      collectionData(query(ticketsCollection, where('status', 'in', ['Aberto', 'Em andamento', 'Pendente']))).pipe(map(data => data.length)),
      collectionData(usersCollection).pipe(map(data => data.length))
    ]).pipe(
      map(([totalAssets, activeTickets, activeUsers]) => ({ totalAssets, activeTickets, activeUsers }))
    );
  }

  private getRecentTickets(): Observable<Ticket[]> {
    const ticketsCollection = collection(this.firestore, 'chamados');
    const q = query(ticketsCollection, orderBy('createdAt', 'desc'), limit(3));
    return collectionData(q, { idField: 'id' }).pipe(
      map(data => data.map(doc => {
        const ticket = doc as Ticket;
        return {
          ...ticket,
          createdAt: ticket.createdAt ? (ticket.createdAt as any).toDate() : new Date(),
          timeAgo: this.getTimeAgo(ticket.createdAt ? (ticket.createdAt as any).toDate() : new Date())
        };
      }))
    );
  }

  private getRecentAssets(): Observable<Asset[]> {
    const assetsCollection = collection(this.firestore, 'ativos');
    const q = query(assetsCollection, orderBy('createdAt', 'desc'), limit(3));
    return collectionData(q, { idField: 'id' }).pipe(
      map(data => data.map(doc => {
        const asset = doc as Asset;
        return {
          ...asset,
          createdAt: asset.createdAt ? (asset.createdAt as any).toDate() : new Date(),
          lastUpdate: this.getTimeAgo(asset.createdAt ? (asset.createdAt as any).toDate() : new Date())
        };
      }))
    );
  }

  private getChartData(): Observable<ChartData[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera o horário para comparações de dia

    const days: ChartData[] = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 6; i >= 0; i--) { // Últimos 7 dias, começando pelo mais antigo
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      days.push({
        label: dayNames[day.getDay()],
        value: 0,
        count: 0,
        colorClass: 'bar-default' // Cor padrão inicial
      });
    }

    const chamadosCollection = collection(this.firestore, 'chamados');
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const q = query(chamadosCollection,
      where('createdAt', '>=', sevenDaysAgo),
      orderBy('createdAt', 'asc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map(chamados => {
        const dailyAggregates: {
          [key: string]: {
            total: number,
            resolved: number,
            overdue: number,
            veryOverdue: number // Atrasado por mais de 1 dia
          }
        } = {};

        // Inicializa agregados para os últimos 7 dias com datas exatas
        for (let i = 0; i < 7; i++) {
          const day = new Date(today);
          day.setDate(today.getDate() - i);
          const dateKey = day.toISOString().split('T')[0]; // Ex: "2024-07-25"
          dailyAggregates[dateKey] = { total: 0, resolved: 0, overdue: 0, veryOverdue: 0 };
        }

        const now = new Date(); // Data atual para comparação de dueDate

        chamados.forEach(chamadoDoc => {
          const chamado = chamadoDoc as Ticket;
          const createdAtDate = (chamado.createdAt as any).toDate() as Date;
          const dateKey = createdAtDate.toISOString().split('T')[0];

          if (dailyAggregates[dateKey]) {
            dailyAggregates[dateKey].total++;
            if (chamado.status === 'Resolvido') {
              dailyAggregates[dateKey].resolved++;
            } else {
              // Verifica se está atrasado ou muito atrasado
              if (chamado.dueDate) {
                const dueDate = (chamado.dueDate as any).toDate() as Date;
                // Compara apenas a data, ignorando a hora para o cálculo de atraso
                const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const dueDateMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

                if (dueDateMidnight < todayMidnight) { // Se a data de vencimento já passou
                  const diffTime = Math.abs(todayMidnight.getTime() - dueDateMidnight.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays > 1) { // Atrasado por mais de 1 dia
                    dailyAggregates[dateKey].veryOverdue++;
                  } else { // Atrasado (mas não mais de 1 dia)
                    dailyAggregates[dateKey].overdue++;
                  }
                }
              }
            }
          }
        });

        // Mapeia os dados agregados para o formato do gráfico
        return days.map(dayInfo => {
          const dayDate = new Date(today);
          // Ajusta a data do dayInfo para o dia da semana atual correspondente
          const diff = today.getDay() - this.getDayIndex(dayInfo.label);
          dayDate.setDate(today.getDate() - (diff >= 0 ? diff : 7 + diff));

          const dateKey = dayDate.toISOString().split('T')[0];
          const aggregates = dailyAggregates[dateKey] || { total: 0, resolved: 0, overdue: 0, veryOverdue: 0 };

          let colorClass = 'bar-default'; // Default para não resolvido/pendente (branco/cinza)
          if (aggregates.veryOverdue > 0) {
            colorClass = 'bar-red'; // Se houver *qualquer* chamado muito atrasado no dia
          } else if (aggregates.overdue > 0) {
            colorClass = 'bar-orange'; // Se houver *qualquer* chamado atrasado (mas nenhum muito atrasado) no dia
          } else if (aggregates.total > 0 && aggregates.total === aggregates.resolved) {
            colorClass = 'bar-blue'; // Se todos os chamados do dia foram resolvidos
          }

          const resolvedPercentage = aggregates.total > 0 ? (aggregates.resolved / aggregates.total) * 100 : 0;
          return {
            ...dayInfo,
            value: resolvedPercentage, // A altura da barra ainda representa a % de resolução
            count: aggregates.total,
            colorClass: colorClass
          };
        }).sort((a, b) => this.getDayIndex(a.label) - this.getDayIndex(b.label)); // Garante a ordem correta dos dias
      })
    );
  }

  // Método auxiliar para obter o índice do dia da semana (0-6)
  private getDayIndex(dayLabel: string): number {
    switch (dayLabel) {
      case 'Dom': return 0;
      case 'Seg': return 1;
      case 'Ter': return 2;
      case 'Qua': return 3;
      case 'Qui': return 4;
      case 'Sex': return 5;
      case 'Sáb': return 6;
      default: return 0;
    }
  }

  // Método auxiliar para formatar 'timeAgo'
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' anos atrás';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' meses atrás';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' dias atrás';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' horas atrás';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutos atrás';
    return Math.floor(seconds) + ' segundos atrás';
  }

  // --- Métodos Auxiliares da UI/Acessibilidade ---
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
