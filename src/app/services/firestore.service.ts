import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  docData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// --- Interfaces de Dados ---
export interface Asset {
  id?: string;
  name: string;
  serialNumber: string;
  type: string;
  category: 'computers' | 'printers' | 'monitors' | 'accessories' | string;
  status: 'Ativo' | 'Inativo' | 'Manutenção' | 'Aposentado' | string;
  location: string;
  responsible: string;
  description: string;
  patrimony: string;

  createdAt: Date;
  updatedAt?: Date;
  lastMaintenance?: Date; // Data da última manutenção
  lastMaintenanceDescription?: string; // O que foi alterado na última manutenção (para o QR Code)

  specifications?: { [key: string]: any };
  maintenanceHistory?: MaintenanceRecord[];
}

export interface MaintenanceRecord {
  id?: string;
  date: Date;
  type: string;
  description: string;
  technician: string;
}

export interface Chamado {
  id?: string;
  assetId: string;
  assetName: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  description: string;
  dueDate?: Date;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente' | string;
  resolvedAt?: Date;
  status?: 'Aberto' | 'Em Progresso' | 'Resolvido' | 'Fechado' | string;
  title: string; // Mantido 'title' para compatibilidade com seu HTML/TS
}


@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);

  private assetsCollection = collection(this.firestore, 'ativos');
  private chamadosCollection = collection(this.firestore, 'chamados');

  constructor() { }

  // Função utilitária: Converte Timestamp -> Date
  private convertTimestampsToDates<T>(data: any): T {
    if (!data) return data;
    const convertedData = { ...data };

    if (convertedData.createdAt instanceof Timestamp) convertedData.createdAt = convertedData.createdAt.toDate();
    if (convertedData.updatedAt instanceof Timestamp) convertedData.updatedAt = convertedData.updatedAt.toDate();
    if (convertedData.lastMaintenance instanceof Timestamp) convertedData.lastMaintenance = convertedData.lastMaintenance.toDate();
    if (convertedData.dueDate instanceof Timestamp) convertedData.dueDate = convertedData.dueDate.toDate();
    if (convertedData.resolvedAt instanceof Timestamp) convertedData.resolvedAt = convertedData.resolvedAt.toDate();

    if (convertedData.maintenanceHistory && Array.isArray(convertedData.maintenanceHistory)) {
      convertedData.maintenanceHistory = convertedData.maintenanceHistory.map((mh: any) => ({
        ...mh,
        date: mh.date instanceof Timestamp ? mh.date.toDate() : mh.date
      }));
    }
    return convertedData;
  }

  // Função utilitária: Converte Date -> Timestamp
  private convertDatesToTimestamps<T>(data: any): T {
    if (!data) return data;
    const convertedData = { ...data };

    if (convertedData.createdAt instanceof Date) convertedData.createdAt = Timestamp.fromDate(convertedData.createdAt);
    if (convertedData.updatedAt instanceof Date) convertedData.updatedAt = Timestamp.fromDate(convertedData.updatedAt);
    if (convertedData.lastMaintenance instanceof Date) convertedData.lastMaintenance = Timestamp.fromDate(convertedData.lastMaintenance);
    if (convertedData.dueDate instanceof Date) convertedData.dueDate = Timestamp.fromDate(convertedData.dueDate);
    if (convertedData.resolvedAt instanceof Date) convertedData.resolvedAt = Timestamp.fromDate(convertedData.resolvedAt);

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
    const q = query(this.assetsCollection, orderBy('name'));
    return collectionData(q, { idField: 'id' })
      .pipe(
        map(assets => assets.map(asset => this.convertTimestampsToDates<Asset>(asset)))
      );
  }

  getAsset(id: string): Observable<Asset> {
    const assetDoc = doc(this.assetsCollection, id);
    return docData(assetDoc, { idField: 'id' })
      .pipe(
        map(asset => this.convertTimestampsToDates<Asset>(asset))
      ) as Observable<Asset>;
  }

  addAsset(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    const now = new Date();
    const newAssetData = {
      ...asset,
      createdAt: now,
      updatedAt: now,
      lastMaintenance: asset.lastMaintenance || null,
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
      updatedAt: new Date()
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
    const q = query(this.chamadosCollection, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' })
      .pipe(
        map(chamados => chamados.map(chamado => {
          const convertedChamado = this.convertTimestampsToDates<any>(chamado);
          // Mapeia Firestore's 'titulo' para interface's 'title'
          if (convertedChamado.titulo !== undefined) {
            convertedChamado.title = convertedChamado.titulo;
            delete convertedChamado.titulo; // Remove o campo original 'titulo' se desejar
          }
          return convertedChamado as Chamado;
        }))
      );
  }

  getChamado(id: string): Observable<Chamado> {
    const chamadoDoc = doc(this.chamadosCollection, id);
    return docData(chamadoDoc, { idField: 'id' })
      .pipe(
        map(chamado => {
          const convertedChamado = this.convertTimestampsToDates<any>(chamado);
          if (convertedChamado.titulo !== undefined) {
            convertedChamado.title = convertedChamado.titulo;
            delete convertedChamado.titulo;
          }
          return convertedChamado as Chamado;
        })
      ) as Observable<Chamado>;
  }

  async addChamado(chamado: Omit<Chamado, 'id' | 'createdAt'> & { status?: string }): Promise<any> {
    const now = new Date();
    const firestoreData: any = {
      ...chamado,
      createdAt: now,
      status: chamado.status || 'Aberto' // Usa 'Aberto' como padrão se não for fornecido
    };

    // Mapeia interface's 'title' para Firestore's 'titulo'
    if (firestoreData.title !== undefined) {
      firestoreData.titulo = firestoreData.title;
      delete firestoreData.title; // Remove o campo original 'title'
    }

    return await addDoc(this.chamadosCollection, this.convertDatesToTimestamps(firestoreData));
  }

  async updateChamado(chamado: Chamado): Promise<void> {
    if (!chamado.id) {
      return Promise.reject(new Error("O ID do chamado é necessário para atualização."));
    }
    const chamadoDocRef = doc(this.chamadosCollection, chamado.id);
    const firestoreData: any = {
      ...chamado,
      // Se você quiser um campo 'updatedAt' nos seus chamados, descomente abaixo
      // updatedAt: new Date()
    };

    // Mapeia interface's 'title' para Firestore's 'titulo'
    if (firestoreData.title !== undefined) {
      firestoreData.titulo = firestoreData.title;
      delete firestoreData.title;
    }
    // Remove o ID do objeto para não tentar atualizar o ID do documento
    delete firestoreData.id;

    await updateDoc(chamadoDocRef, this.convertDatesToTimestamps(firestoreData));
  }

  deleteChamado(id: string): Promise<void> {
    const chamadoDocRef = doc(this.chamadosCollection, id);
    return deleteDoc(chamadoDocRef);
  }
}
