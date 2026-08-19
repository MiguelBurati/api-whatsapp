const { sendButtons } = require('../../buttons');

async function sendOrcamentoMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '💰 Orçamento',
        text: 'Selecione o tipo de orçamento que deseja:',
        footer: '💡 Estamos aqui para ajudar!',
        buttons: [
            { id: 'orc_motor', text: '🔧 Motor' },
            { id: 'orc_camera', text: '📷 Câmera' },
            { id: 'orc_alarme', text: '🚨 Alarme' },
            { id: 'orc_interfonia', text: '📞 Interfonia' },
            { id: 'orc_cerca_eletrica', text: '⚡ Cerca Elétrica/Concertina' },
            { id: 'orc_paineis_solares', text: '☀️ Painéis Solares' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' }
        ]
    });
}

module.exports = { sendOrcamentoMenu };