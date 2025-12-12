// Arquivo: functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// 1. INICIALIZAÇÃO DO ADMIN SDK
admin.initializeApp();


// 🚨 FUNÇÃO PARA DEFINIR A PATENTE DE UM USUÁRIO (CUSTOM CLAIM)
exports.atribuirPatente = functions.https.onCall(async (data, context) => {

    // --- 1. VERIFICAÇÃO DE SEGURANÇA ---
    // Apenas quem já tem a patente 'admin' pode atribuir patentes a outros.
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Acesso negado. Apenas administradores podem atribuir patentes.'
        );
    }
    
    // Validação dos dados de entrada
    const { email, role } = data; 
    
    if (!email || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'Email e cargo (role) são obrigatórios.');
    }

    // Garante que o cargo é um dos aceitos
    const acceptedRoles = ['admin', 'tecnico', 'usuario'];
    if (!acceptedRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', `Cargo inválido: ${role}. Cargos aceitos: ${acceptedRoles.join(', ')}.`);
    }

    try {
        // --- 2. ENCONTRAR E DEFINIR A CLAIM ---
        const user = await admin.auth().getUserByEmail(email);

        await admin.auth().setCustomUserClaims(user.uid, { 
            role: role 
        });

        // 3. Forçar a reemissão do Token (Para que o usuário receba a patente)
        await admin.auth().revokeRefreshTokens(user.uid);

        return { 
            message: `Sucesso! O usuário ${email} agora tem a patente: ${role}.`,
            success: true
        };
        
    } catch (error) {
        console.error("Erro ao definir claims:", error);
        throw new functions.https.HttpsError('internal', 'Erro ao processar a requisição de cargo.', error.message);
    }
});