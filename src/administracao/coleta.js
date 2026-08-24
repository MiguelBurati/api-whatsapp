const { sendMainMenu, sendMenuFinal } = require('../shared/menu');

async function startAdministracaoColeta(sock, jid, session, tipo) {
    session.state = 'coleta_dados';
    session.fluxo_atual = 'adm/financeiro';
    session['adm/financeiro_tipo'] = tipo; 
    session.data = { 
        tipo_adm_financeiro: tipo
    };
    session.perguntas = [
        { 
            pergunta: 'Qual é o seu nome?', 
            campo: 'nome', 
            validacao: (valor) => valor.trim().length > 2 
        },
        { 
            pergunta: 'Em que podemos ajudar?' + session.data.nome, 
            campo: 'problema', 
            validacao: (valor) => valor.trim().length > 5 
        }
    ];
    
    // Envia a primeira pergunta
    await sock.sendMessage(jid, { text: session.perguntas[0].pergunta });
}