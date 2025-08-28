
// JavaScript para verificar las transacciones del bridge
console.log('=== Verificando Bridge Transactions ===');
const bridgeTransactions = localStorage.getItem('vindex_bridge_transactions');
console.log('Bridge transactions:', bridgeTransactions ? JSON.parse(bridgeTransactions) : 'None');

const vindexTransactions = localStorage.getItem('vindex_transactions');
console.log('Vindex transactions:', vindexTransactions ? JSON.parse(vindexTransactions) : 'None');

