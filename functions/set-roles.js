// Arquivo: functions/set-roles.js (Para rodar localmente)

const admin = require('firebase-admin');

// 🚨 1. ATENÇÃO: SUBSTITUA PELO CAMINHO CORRETO DA SUA CHAVE PRIVADA JSON
const serviceAccount = require("C:/Users/K4NnA/Downloads/frontend-design-bugs-corrigidos/frontend-design/frontend-e-back/functions/sigti-f53e8-firebase-adminsdk-fbsvc-6cca8b13bb.json"); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Usuários que você quer configurar
const USERS_TO_SET = [
    { 
        email: "Liboriop416@gmail.com", 
        role: "admin" 
    },
    { 
        email: "n4teai23@gmail.com", 
        role: "usuario" 
    }
    // Adicione mais usuários se precisar (lembra disso)
];

async function setRoles() {
    console.log("Iniciando a atribuição de patentes...");

    for (const user of USERS_TO_SET) {
        try {
            // 2. Busca o usuário pelo e-mail
            const firebaseUser = await admin.auth().getUserByEmail(user.email);
            
            // 3. Define o Custom Claim (A Patente)
            await admin.auth().setCustomUserClaims(firebaseUser.uid, { 
                role: user.role 
            });

            // 4. Invalida o token antigo (força a atualização no próximo login)
            await admin.auth().revokeRefreshTokens(firebaseUser.uid);

            console.log(`✅ Sucesso! Usuário: ${user.email} -> Patente: ${user.role}`);

        } catch (error) {
            console.error(`❌ ERRO ao processar ${user.email}. O e-mail existe no Firebase Auth?`, error.message);
        }
    }
    console.log("Atribuição de patentes concluída.");
}

setRoles();