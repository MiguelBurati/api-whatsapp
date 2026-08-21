const { sendButtons } = require('../../buttons');

async function sendMainMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '👋 Olá! Seja bem-vindo(a) à nossa central de atendimento!',
        text: 'Selecione a opção desejada para continuar:',
        footer: '💡 Estamos aqui para ajudar!',
        buttons: [
            { id: 'menu_orcamento', text: '1️⃣ Orçamento' },
            { id: 'menu_manutencao', text: '2️⃣ Manutenção' },
            { id: 'menu_administracao', text: '3️⃣ Administração/Financeiro' },
            { id: 'menu_impressoes3d', text: '4️⃣ Impressões 3D' },
            { id: 'menu_outros', text: '5️⃣ Outros' }
        ]
    });
}

async function sendMenuFinal(sock, jid) {
    await sendButtons(sock, jid, {
        title: 'Obrigado pelo seu contato!',
        text: 'O que deseja fazer agora?',
        buttons: [
            { id: 'menu_principal', text: '↩️ Voltar ao menu principal' },
            { id: 'menu_sair', text: '❌ Encerrar atendimento' }
        ]
    });
}

module.exports = { sendMainMenu, sendMenuFinal };