import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirestoreService, Asset, MaintenanceRecord } from '../../../services/firestore.service'; // Ajuste o caminho conforme sua estrutura
import { provideNgxMask, NgxMaskDirective } from 'ngx-mask'; // Importe conforme necessidade

@Component({
  selector: 'app-asset-form',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxMaskDirective], // Mantenha NgxMaskDirective se for usar ngx-mask
  providers: [DatePipe, provideNgxMask()], // Mantenha provideNgxMask() se for usar ngx-mask
  templateUrl: './asset-form.component.html',
  styleUrl: './asset-form.component.scss'
})
export class AssetFormComponent implements OnInit {
  private firestoreService = inject(FirestoreService);
  public router = inject(Router); // Corrigido para public

  // --- CORREÇÃO AQUI: Tipagem explícita para o newAsset ---
  newAsset: Partial<Asset>; // Usamos Partial para tornar todas as propriedades opcionais inicialmente

  // Para a interface de especificações
  currentSpecKey: string = '';
  currentSpecValue: string = '';

  // Para a interface de histórico de manutenção
  newMaintenanceRecord: Omit<MaintenanceRecord, 'id'> = {
    date: new Date(),
    type: '',
    description: '',
    technician: ''
  };

  constructor() {
    // Inicialização do newAsset com valores padrão para todas as propriedades
    // Isso garante que o TypeScript entenda a estrutura do objeto.
    this.newAsset = {
      name: '',
      serialNumber: '',
      type: '',
      category: 'computers',
      status: 'Ativo',
      location: '',
      responsible: '',
      description: '',
      patrimony: '',
      lastMaintenance: new Date(),
      specifications: {},
      maintenanceHistory: []
    };
  }

  ngOnInit(): void {
    // Se fosse uma tela de edição, aqui você carregaria o ativo
    // Para criar, deixamos vazio
  }

  // Adiciona uma especificação
  addSpecification() {
    if (this.currentSpecKey && this.currentSpecValue) {
      if (!this.newAsset.specifications) {
        this.newAsset.specifications = {};
      }
      this.newAsset.specifications[this.currentSpecKey] = this.currentSpecValue;
      this.currentSpecKey = '';
      this.currentSpecValue = '';
    }
  }

  // Remove uma especificação
  removeSpecification(key: string) {
    if (this.newAsset.specifications) {
      delete this.newAsset.specifications[key];
    }
  }

  // Adiciona um registro de manutenção
  addMaintenance() {
    if (this.newMaintenanceRecord.type && this.newMaintenanceRecord.description && this.newMaintenanceRecord.technician) {
      if (!this.newAsset.maintenanceHistory) {
        this.newAsset.maintenanceHistory = [];
      }
      // Adicionamos uma cópia para não vincular diretamente o objeto de input
      this.newAsset.maintenanceHistory.push({ ...this.newMaintenanceRecord, date: new Date(this.newMaintenanceRecord.date) });
      // Reseta o formulário de manutenção
      this.newMaintenanceRecord = {
        date: new Date(),
        type: '',
        description: '',
        technician: ''
      };
    }
  }

  // Remove um registro de manutenção
  removeMaintenance(index: number) {
    if (this.newAsset.maintenanceHistory) {
      this.newAsset.maintenanceHistory.splice(index, 1);
    }
  }

  async onSubmit() {
    // Convertemos para o tipo Asset completo antes de enviar, já que o FirestoreService.addAsset espera
    // Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>.
    // Garantimos que todos os campos obrigatórios da interface Asset estejam presentes aqui.
    const assetToSave: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> = {
      name: this.newAsset.name || '',
      serialNumber: this.newAsset.serialNumber || '',
      type: this.newAsset.type || '',
      category: this.newAsset.category || 'computers',
      status: this.newAsset.status || 'Ativo',
      location: this.newAsset.location || '',
      responsible: this.newAsset.responsible || '',
      description: this.newAsset.description || '',
      patrimony: this.newAsset.patrimony || '',
      lastMaintenance: this.newAsset.lastMaintenance || new Date(), // Usar new Date() como fallback
      specifications: this.newAsset.specifications || {},
      maintenanceHistory: this.newAsset.maintenanceHistory || []
    };

    try {
      await this.firestoreService.addAsset(assetToSave);
      alert('Ativo adicionado com sucesso!');
      this.router.navigate(['/ativos']);
    } catch (error) {
      console.error("Erro ao adicionar ativo:", error);
      alert('Erro ao adicionar ativo.');
    }
  }

  getSpecificationsArray(specs: { [key: string]: any } | undefined): { key: string, value: any }[] {
    if (!specs) return [];
    return Object.entries(specs).map(([key, value]) => ({ key, value }));
  }
}
