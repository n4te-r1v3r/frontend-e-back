import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

interface User {
  name: string;
  role: string;
  avatar?: string;
}

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss'
})
export class NavigationComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // Estado da navegação
  isNavOpen = false;
  isUserMenuOpen = false;
  pendingTickets = 5; // Simulado
  
  // Usuário atual
  currentUser: User = {
    name: 'Ana Silva',
    role: 'Administrador',
    avatar: '' // Pode ser uma URL de imagem
  };
  
  // Breadcrumbs
  breadcrumbs: Breadcrumb[] = [];
  
  // Mapeamento de rotas para breadcrumbs
  private routeLabels: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/chamados': 'Chamados',
    '/relatorios': 'Relatórios',
    '/ativos': 'Ativos',
    '/perfil': 'Perfil',
    '/configuracoes': 'Configurações'
  };

  ngOnInit() {
    this.setupRouteListener();
    this.setupKeyboardShortcuts();
    this.updateBreadcrumbs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // === MÉTODOS DE NAVEGAÇÃO ===
  toggleNavigation() {
    this.isNavOpen = !this.isNavOpen;
    this.announceAction(`Menu ${this.isNavOpen ? 'aberto' : 'fechado'}`);
    
    // Gerenciar foco
    if (this.isNavOpen) {
      this.trapFocus();
    } else {
      this.releaseFocus();
    }
  }

  closeNavigation() {
    this.isNavOpen = false;
    this.announceAction('Menu fechado');
    this.releaseFocus();
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.announceAction(`Menu do usuário ${this.isUserMenuOpen ? 'aberto' : 'fechado'}`);
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  // === MÉTODOS DE USUÁRIO ===
  openProfile() {
    this.router.navigate(['/perfil']);
    this.closeUserMenu();
    this.announceAction('Navegando para perfil');
  }

  openSettings() {
    this.router.navigate(['/configuracoes']);
    this.closeUserMenu();
    this.announceAction('Navegando para configurações');
  }

  logout() {
    this.announceAction('Fazendo logout');
    // Implementar lógica de logout
    this.router.navigate(['/login']);
  }

  // === MÉTODOS AUXILIARES ===
  isCurrentPage(route: string): boolean {
    return this.router.url === route;
  }

  private setupRouteListener() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateBreadcrumbs();
        this.closeNavigation();
        this.closeUserMenu();
      });
  }

  private updateBreadcrumbs() {
    const url = this.router.url;
    const segments = url.split('/').filter(segment => segment);
    
    this.breadcrumbs = [];
    let currentPath = '';
    
    // Sempre adicionar "Início" como primeiro item
    this.breadcrumbs.push({ label: 'Início', url: '/dashboard' });
    
    // Adicionar segmentos da URL atual
    segments.forEach(segment => {
      currentPath += `/${segment}`;
      const label = this.routeLabels[currentPath] || this.formatSegment(segment);
      
      if (currentPath !== '/dashboard') {
        this.breadcrumbs.push({ label, url: currentPath });
      }
    });
  }

  private formatSegment(segment: string): string {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  }

  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Fechar menus com Escape
      if (event.key === 'Escape') {
        if (this.isUserMenuOpen) {
          this.closeUserMenu();
        } else if (this.isNavOpen) {
          this.closeNavigation();
        }
      }
      
      // Atalhos de navegação
      if (event.altKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            this.router.navigate(['/dashboard']);
            break;
          case '2':
            event.preventDefault();
            this.router.navigate(['/chamados']);
            break;
          case '3':
            event.preventDefault();
            this.router.navigate(['/relatorios']);
            break;
          case '4':
            event.preventDefault();
            this.router.navigate(['/ativos']);
            break;
        }
      }
    });
  }

  private trapFocus() {
    // Implementar trap de foco para acessibilidade
    const navElement = document.querySelector('.main-navigation');
    const focusableElements = navElement?.querySelectorAll(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements && focusableElements.length > 0) {
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      // Focar no primeiro elemento
      setTimeout(() => firstElement.focus(), 100);
      
      // Gerenciar navegação por Tab
      const handleTabKey = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      };
      
      document.addEventListener('keydown', handleTabKey);
      
      // Remover listener quando o menu fechar
      const removeListener = () => {
        document.removeEventListener('keydown', handleTabKey);
      };
      
      setTimeout(() => {
        if (!this.isNavOpen) {
          removeListener();
        }
      }, 100);
    }
  }

  private releaseFocus() {
    // Retornar foco para o elemento que abriu o menu
    const toggleButton = document.querySelector('.nav-toggle') as HTMLElement;
    if (toggleButton) {
      toggleButton.focus();
    }
  }

  // === LISTENERS DE EVENTOS ===
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const window = event.target as Window;
    if (window.innerWidth > 768 && this.isNavOpen) {
      this.closeNavigation();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const navElement = document.querySelector('.main-navigation');
    const userMenuElement = document.querySelector('.user-menu');
    
    // Fechar menu de usuário se clicar fora
    if (this.isUserMenuOpen && userMenuElement && !userMenuElement.contains(target)) {
      this.closeUserMenu();
    }
    
    // Fechar navegação mobile se clicar fora
    if (this.isNavOpen && navElement && !navElement.contains(target)) {
      this.closeNavigation();
    }
  }

  // === MÉTODOS DE ACESSIBILIDADE ===
  private announceAction(message: string) {
    const announcer = document.getElementById('navigation-announcements');
    if (announcer) {
      announcer.textContent = message;
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  }
}
