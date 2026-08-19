const { sendButtons } = require('../../buttons');

async function sendManutencaoMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🔧 Manutenção',
        text: 'Selecione o tipo de manutenção:',
        footer: '💡 Estamos aqui para ajudar!',
        buttons: [
            { id: 'manut_motor', text: '🔧 Motor' },
            { id: 'manut_camera', text: '📷 Câmeras' },
            { id: 'manut_alarme', text: '🚨 Alarme' },
            { id: 'manut_interfonia', text: '📞 Interfonia' },
            { id: 'manut_cerca', text: '⚡ Cerca Elétrica' },
            { id: 'manut_solar', text: '☀️ Painéis Solares' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' }
        ]
    });
}

module.exports = { sendManutencaoMenu };