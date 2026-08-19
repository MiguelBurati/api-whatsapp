const { sendButtons } = require('../../buttons');

async function sendOutrosMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '📋 Outros Serviços',
        text: 'Selecione uma opção ou nos conte o que precisa:',
        footer: '💡 Estamos aqui para ajudar!',
        buttons: [
            { id: 'outros_duvidas', text: '❓ Dúvidas Gerais' },
            { id: 'outros_parceria', text: '🤝 Parcerias' },
            { id: 'outros_falar_atendente', text: '💬 Falar com Atendente' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' }
        ]
    });
}

module.exports = { sendOutrosMenu };