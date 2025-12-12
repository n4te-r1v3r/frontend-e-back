import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes'; // Rotas principais
import { environment } from '../environments/environments'; // Seu arquivo de ambiente

// >> IMPORTS DOS SERVIÇOS FIREBASE/ANGULARFIRE <<
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideHttpClient } from '@angular/common/http'; // Adicionado, boa prática

// Se você precisar de outros serviços, descomente e importe-os:
// import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
// import { provideMessaging, getMessaging } from '@angular/fire/messaging';
// import { providePerformance, getPerformance } from '@angular/fire/performance';
// import { provideRemoteConfig, getRemoteConfig } from '@angular/fire/remote-config'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(), // Necessário para a arquitetura Angular moderna

    // >> CONFIGURAÇÃO DO FIREBASE <<
    provideFirebaseApp(() => initializeApp(environment.firebase)), // Inicialização principal
    
    // Provedores de Serviço Ativos
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()), // ⭐️ ESSENCIAL para o ReportService
    provideDatabase(() => getDatabase()), 
    provideStorage(() => getStorage()),   

    // Provedores de Serviço Comentados (Ative se necessário)
    // provideAnalytics(() => getAnalytics()),
    // provideMessaging(() => getMessaging()),
    // providePerformance(() => getPerformance()),
    // provideRemoteConfig(() => getRemoteConfig()),
  ]
};