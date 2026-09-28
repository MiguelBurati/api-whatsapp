const { sendButtons } = require('../../buttons');

async function sendMainMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '👋 Olá! Seja bem-vindo(a) à nossa central de atendimento!',
        text: "🕒 Horário de atendimento: Segunda a Sexta-feira, das 8h às 17h\n\n✅ Selecione a opção desejada para continuar.\n\n❌ Para encerrar o atendimento a qualquer momento, envie *#sair*.",
        
        buttons: [
            { id: 'menu_orcamento', text: '1️⃣ Orçamento' },
            { id: 'menu_manutencao', text: '2️⃣ Manutenção' },
            { id: 'menu_administracao', text: '3️⃣ Administração/Financeiro' },
            { id: 'menu_impressoes3d', text: '4️⃣ Impressões 3D' },
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
