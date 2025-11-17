import { Component } from '@angular/core';
import { Router, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'] // ✅ Corrigido: styleUrls (plural)
})
export class SidebarComponent {
  
  constructor(private router: Router) {}

  navigateTo(route: string) {
    console.log('Navegando para:', route);
    this.router.navigate([route]).then(
      (success) => console.log('Navegação bem-sucedida:', success),
      (error) => console.log('Erro na navegação:', error)
    );
  }
}
