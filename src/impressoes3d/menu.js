const { sendButtons } = require('../../buttons');

async function sendImpressoesMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🖨️ Impressões 3D',
        text: 'Selecione uma ação:',
        buttons: [
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🖼️ Ver catálogo',
                    url: 'https://loja.menu/s3dimpressoespersonalizadas'
                })
            },
            { id: 'imp_orcamento', text: '💰 Solicitar orçamento' },
            { id: 'voltar_menu', text: '🔙 Voltar' }
        ]
    });
}

module.exports = { sendImpressoesMenu };