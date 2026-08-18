// src/menus.js
const { sendButtons } = require('../buttons');

async function sendMainMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '👋 Olá! Seja bem‑vindo(a) à nossa central de atendimento!',
        text: 'Selecione a opção desejada para continuar:',
        footer: '💡 Estamos aqui para ajudar!',
        buttons: [
            { id: 'menu_orcamento', text: '1️⃣ Orçamento' },
            { id: 'menu_manutencao', text: '2️⃣ Manutenção' },
            { id: 'menu_administracao', text: '3️⃣ Administração/Financeiro' },
            { id: 'menu_impressoes3d', text: '4️⃣ Impressões 3D' },
            { id: 'menu_outros', text: '5️⃣ Outros' },
        ],
    });
}

async function sendmenu_orcamento(sock, jid) {
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
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' },
        ],
    });
}

async function sendmenu_manutencao(sock, jid) {
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
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' },
        ],
    });
}

async function sendImpressoesMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🖨️ Impressões 3D',
        text: 'Selecione uma ação:',
        buttons: [
            { id: 'imp_catalogo', text: '🖼️ Ver catálogo' },
            { id: 'imp_orcamento', text: '💰 Solicitar orçamento' },
            { id: 'imp_consulta', text: '🔍 Consultar pedido' },
            { id: 'imp_alterar', text: '✏️ Alterar pedido' },
            { id: 'voltar_menu', text: '🔙 Voltar' },
        ],
    });
}

async function sendAdministracaoMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '📊 Administração/Financeiro',
        text: 'Selecione uma opção:',
        footer: '💡 Estamos aqui para ajudar!',
        buttons: [
            { id: 'admin_fatura', text: '📄 Fatura/Nota Fiscal' },
            { id: 'admin_pagamento', text: '💳 Formas de Pagamento' },
            { id: 'admin_suporte', text: '👨‍💼 Falar com Financeiro' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' },
        ],
    });
}

async function sendOutrosMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '📋 Outros Serviços',
        text: 'Selecione uma opção ou nos conte o que precisa:',
        footer: '💡 Estamos aqui para ajudar!',
        buttons: [
            { id: 'outros_duvidas', text: '❓ Dúvidas Gerais' },
            { id: 'outros_parceria', text: '🤝 Parcerias' },
            { id: 'outros_falar_atendente', text: '💬 Falar com Atendente' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' },
        ],
    });
}

module.exports = {
    sendMainMenu,
    sendmenu_orcamento,
    sendmenu_manutencao,
    sendImpressoesMenu,
    sendAdministracaoMenu,
    sendOutrosMenu,
};