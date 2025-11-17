import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  // where, // Não usado diretamente neste serviço atualmente
  orderBy,
  limit,
  Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// --- Interfaces de Dados ---
// Define a estrutura de um Ativo
export interface Asset {
  id?: string;
  name: string;
  serialNumber: string; // Campo conforme sua lista
  type: string;
  category: 'computers' | 'printers' | 'monitors' | 'accessories' | string;
  status: 'Ativo' | 'Inativo' | 'Manutenção' | 'Aposentado' | string;
  location: string;
  responsible: string; // Campo usado no frontend (HTML/TS)
  description: string;
  patrimony: string; // Campo usado no frontend (HTML/TS)

  createdAt: Date;
  updatedAt?: Date;
  lastMaintenance?: Date;

  specifications?: { [key: string]: any };
  maintenanceHistory?: MaintenanceRecord[];
}

// Define a estrutura de um Registro de Manutenção
export interface MaintenanceRecord {
  id?: string;
  date: Date;
  type: string;
  description: string;
  technician: string;
}

// Define a estrutura de um Chamado
export interface Chamado {
  id?: string;
  assetId: string;
  assetName: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  description: string; // "discription" no seu texto, mas usando "description" por convenção
  dueDate?: Date;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente' | string;
  resolvedAt?: Date;
  status: 'Aberto' | 'Em Progresso' | 'Resolvido' | 'Fechado' | string;
  title: string;
}


@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);

  // Referência à coleção 'ativos' no Firestore
  private assetsCollection = collection(this.firestore, 'ativos');
  // Referência à coleção 'chamados' no Firestore
  private chamadosCollection = collection(this.firestore, 'chamados');


  constructor() { }

  // Função utilitária: Converte Timestamp do Firestore para Date em TypeScript
  private convertTimestampsToDates<T>(data: any): T {
    if (!data) return data;

    const convertedData = { ...data };

    if (convertedData.createdAt instanceof Timestamp) {
      convertedData.createdAt = convertedData.createdAt.toDate();
    }
    if (convertedData.updatedAt instanceof Timestamp) {
      convertedData.updatedAt = convertedData.updatedAt.toDate();
    }
    if (convertedData.lastMaintenance instanceof Timestamp) {
      convertedData.lastMaintenance = convertedData.lastMaintenance.toDate();
    }
    if (convertedData.dueDate instanceof Timestamp) { // Para Chamado
      convertedData.dueDate = convertedData.dueDate.toDate();
    }
    if (convertedData.resolvedAt instanceof Timestamp) { // Para Chamado
      convertedData.resolvedAt = convertedData.resolvedAt.toDate();
    }

    if (convertedData.maintenanceHistory && Array.isArray(convertedData.maintenanceHistory)) {
      convertedData.maintenanceHistory = convertedData.maintenanceHistory.map((mh: any) => ({
        ...mh,
        date: mh.date instanceof Timestamp ? mh.date.toDate() : mh.date
      }));
    }
    return convertedData;
  }

  // Função utilitária: Converte Date do TypeScript para Timestamp para o Firestore
  private convertDatesToTimestamps<T>(data: any): T {
    if (!data) return data;

    const convertedData = { ...data };

    if (convertedData.createdAt instanceof Date) {
      convertedData.createdAt = Timestamp.fromDate(convertedData.createdAt);
    }
    if (convertedData.updatedAt instanceof Date) {
      convertedData.updatedAt = Timestamp.fromDate(convertedData.updatedAt);
    }
    if (convertedData.lastMaintenance instanceof Date) {
      convertedData.lastMaintenance = Timestamp.fromDate(convertedData.lastMaintenance);
    }
    if (convertedData.dueDate instanceof Date) { // Para Chamado
      convertedData.dueDate = Timestamp.fromDate(convertedData.dueDate);
    }
    if (convertedData.resolvedAt instanceof Date) { // Para Chamado
      convertedData.resolvedAt = Timestamp.fromDate(convertedData.resolvedAt);
    }

    if (convertedData.maintenanceHistory && Array.isArray(convertedData.maintenanceHistory)) {
      convertedData.maintenanceHistory = convertedData.maintenanceHistory.map((mh: any) => ({
        ...mh,
        date: mh.date instanceof Date ? Timestamp.fromDate(mh.date) : mh.date
      }));
    }
    return convertedData;
  }

  // --- Métodos para 'ativos' ---
  getAssets(): Observable<Asset[]> {
    return collectionData(this.assetsCollection, { idField: 'id' })
      .pipe(
        map(assets => assets.map(asset => this.convertTimestampsToDates<Asset>(asset)))
      );
  }

  addAsset(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    const now = new Date();
    const newAssetData = {
      ...asset,
      createdAt: now,
      updatedAt: now,
      // Garante que lastMaintenance seja um Date antes de converter, ou null/undefined
      lastMaintenance: asset.lastMaintenance || null, // Ou um valor padrão se for sempre obrigatório
      maintenanceHistory: asset.maintenanceHistory || []
    };
    return addDoc(this.assetsCollection, this.convertDatesToTimestamps(newAssetData));
  }

  updateAsset(asset: Asset): Promise<void> {
    if (!asset.id) {
      return Promise.reject(new Error("O ID do ativo é necessário para atualização."));
    }
    const assetDocRef = doc(this.firestore, `ativos/${asset.id}`);
    const updatedAssetData = {
      ...asset,
      updatedAt: new Date() // Atualiza updatedAt a cada modificação
    };
    return updateDoc(assetDocRef, this.convertDatesToTimestamps(updatedAssetData));
  }

  deleteAsset(id: string): Promise<void> {
    const assetDocRef = doc(this.firestore, `ativos/${id}`);
    return deleteDoc(assetDocRef);
  }

  getRecentAssets(numLimit: number = 3): Observable<Asset[]> {
    const q = query(this.assetsCollection, orderBy('createdAt', 'desc'), limit(numLimit));
    return collectionData(q, { idField: 'id' })
      .pipe(
        map(assets => assets.map(asset => this.convertTimestampsToDates<Asset>(asset)))
      );
  }

  getTotalAssetsCount(): Observable<number> {
    return this.getAssets().pipe(
      map(assets => assets.length)
    );
  }

  // --- Métodos para 'chamados' ---
  getChamados(): Observable<Chamado[]> {
    return collectionData(this.chamadosCollection, { idField: 'id' })
      .pipe(
        map(chamados => chamados.map(chamado => this.convertTimestampsToDates<Chamado>(chamado)))
      );
  }

  addChamado(chamado: Omit<Chamado, 'id' | 'createdAt'>): Promise<any> {
    const now = new Date();
    const newChamadoData = {
      ...chamado,
      createdAt: now
    };
    return addDoc(this.chamadosCollection, this.convertDatesToTimestamps(newChamadoData));
  }
  // ... outros métodos para chamados
}
