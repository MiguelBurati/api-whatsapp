const { sendButtons } = require('../../buttons');

async function sendAdministracaoMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '📊 Administativo/Financeiro',
        text: 'Selecione uma opção:',
        footer: '💡 Estamos aqui para ajudar!',
        buttons: [
            { id: 'admin_suporte', text: '👨‍💼 Falar com Financeiro' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' }
        ]
    });
}

module.exports = { sendAdministracaoMenu };