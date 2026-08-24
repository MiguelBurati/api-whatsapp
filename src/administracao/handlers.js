const { handleColetaResposta: handleGenericColetaResposta } = require('../shared/coletaHandler');
const { finalizarColetaAdministracao } = require('./coleta');

async function handleColetaResposta(args) {
    return handleGenericColetaResposta({ ...args, finalizarColeta: finalizarColetaAdministracao });
}