// shared/blacklist.js
const dotenv = require('dotenv');
dotenv.config();

// Função para normalizar números (remove tudo que não é dígito)
function normalizeNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

// Função para extrair o número corretamente do JID (suporte a LID)
function extractNumberFromJid(jid) {
    if (!jid) return null;
    
    let cleanJid = jid.split('@')[0];
    cleanJid = cleanJid.split(':')[0];
    
    const number = normalizeNumber(cleanJid);
    return number || null;
}

// Carrega os números da blacklist (usuários BLOQUEADOS) do .env
const rawNumbers = (process.env.BLACKLIST_NUMBERS || '')
    .split(',')
    .filter(Boolean)
    .map(n => n.trim());

const blockedNumbers = new Set(
    rawNumbers.map(normalizeNumber).filter(Boolean)
);

console.log('🔒 Blacklist (usuários bloqueados):', Array.from(blockedNumbers));

// Carrega os números dos ATENDENTES (não são bloqueados, são identificados)
const rawAttendants = (process.env.ATTENDANT_NUMBERS || '')
    .split(',')
    .filter(Boolean)
    .map(n => n.trim());

const attendantNumbers = new Set(
    rawAttendants.map(normalizeNumber).filter(Boolean)
);

console.log('👤 Atendentes cadastrados:', Array.from(attendantNumbers));

// Verifica se algum JID está na blacklist (usuários bloqueados)
function isBlacklisted(...jids) {
    return jids
        .filter(Boolean)
        .some((jid) => {
            const number = extractNumberFromJid(jid);
            if (!number) return false;
            const blocked = blockedNumbers.has(number);
            if (blocked) {
                console.log(`  🔍 ${jid} -> ${number} -> BLOQUEADO`);
            }
            return blocked;
        });
}

// Verifica se é atendente (lista SEPARADA da blacklist)
function isAttendant(jid) {
    if (!jid) return false;
    
    const number = extractNumberFromJid(jid);
    if (!number) return false;
    
    const isAtt = attendantNumbers.has(number);
    
    if (isAtt) {
        console.log(`  👤 isAttendant: ${jid} -> ${number} -> ✅ ATENDENTE`);
    }
    
    return isAtt;
}

function getBlockedNumbers() {
    return Array.from(blockedNumbers);
}

// 🔥 NOVO: retorna a lista de atendentes (usado no startBot)
function getAttendantNumbers() {
    return Array.from(attendantNumbers);
}

function addToBlacklist(number) {
    const normalized = normalizeNumber(number);
    if (normalized) {
        blockedNumbers.add(normalized);
        console.log(`✅ Número adicionado à blacklist: ${normalized}`);
        return true;
    }
    return false;
}

function removeFromBlacklist(number) {
    const normalized = normalizeNumber(number);
    if (normalized) {
        const removed = blockedNumbers.delete(normalized);
        if (removed) {
            console.log(`❌ Número removido da blacklist: ${normalized}`);
        }
        return removed;
    }
    return false;
}

module.exports = { 
    isBlacklisted, 
    isAttendant, 
    normalizeNumber,
    extractNumberFromJid,
    getBlockedNumbers,
    getAttendantNumbers,
    addToBlacklist,
    removeFromBlacklist
};