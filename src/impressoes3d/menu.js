const { sendButtons } = require('../../buttons');

async function sendImpressoesMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🖨️ Impressões 3D',
        text: 'Selecione uma ação:',
        buttons: [
            { id: 'imp_catalogo', text: '🖼️ Ver catálogo' },
            { id: 'imp_orcamento', text: '💰 Solicitar orçamento' },
            { id: 'imp_consulta', text: '🔍 Consultar pedido' },
            { id: 'imp_alterar', text: '✏️ Alterar pedido' },
            { id: 'voltar_menu', text: '🔙 Voltar' }
        ]
    });
}

module.exports = { sendImpressoesMenu };