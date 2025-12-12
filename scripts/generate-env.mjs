import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

config();

const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_MEASUREMENT_ID',
  'FIREBASE_DATABASE_URL',
];

const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Variáveis ausentes no .env: ${missing.join(', ')}`);
}

const resetPasswordUrl =
  process.env.RESET_PASSWORD_URL || 'http://localhost:4200/login';

const firebase = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

const makeEnvFile = (production) =>
  `export const environment = {
  production: ${production},
  firebase: ${JSON.stringify(firebase, null, 2)},
  resetPasswordUrl: '${resetPasswordUrl}'
};
`;

const targetDir = resolve('src/environments');
mkdirSync(targetDir, { recursive: true });

writeFileSync(resolve(targetDir, 'environments.ts'), makeEnvFile(false), {
  encoding: 'utf8',
});

writeFileSync(resolve(targetDir, 'environment.prod.ts'), makeEnvFile(true), {
  encoding: 'utf8',
});

