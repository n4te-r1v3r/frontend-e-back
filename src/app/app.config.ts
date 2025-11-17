import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes'; // rotas feitas
import { environment } from '../environments/environments'; // arquivo ambiente 

// >> IMPORTS DOS SERVIÇOS FIREBASE/ANGULARFIRE <<
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideDatabase, getDatabase } from '@angular/fire/database'; // <<-- presta ateção NOVO: Realtime Database
import { provideStorage, getStorage } from '@angular/fire/storage'; // <<-- NOVO: Cloud Storage

// Adicione aqui os imports para os outros serviços Firebase que você selecionou:
//import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
// import { provideMessaging, getMessaging } from '@angular/fire/messaging';
// import { providePerformance, getPerformance } from '@angular/fire/performance';
// import { provideRemoteConfig, getRemoteConfig } from '@angular/fire/remote-config'; // se selecionou Remote Config

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // >> CONFIGURAÇÃO DO FIREBASE AQUI <<
    provideFirebaseApp(() => initializeApp(environment.firebase)), // <<-- Usa environment.firebase
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()), // <<-- NOVO: Provedor Realtime Database
    provideStorage(() => getStorage()),   // <<-- NOVO: Provedor Cloud Storage

    // Adicione aqui os provedores para os outros serviços Firebase que você selecionou:
    // provideAnalytics(() => getAnalytics()),
    // provideMessaging(() => getMessaging()),
    // providePerformance(() => getPerformance()),
    // provideRemoteConfig(() => getRemoteConfig()), // se selecionou Remote Config
  ]
};
