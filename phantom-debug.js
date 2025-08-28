/**
 * Debug script para verificar conexión de Phantom Wallet
 * Ejecutar en la consola del navegador
 */

// Función para verificar Phantom Wallet
function debugPhantomWallet() {
  console.log('=== PHANTOM WALLET DEBUG ===');
  
  // 1. Verificar existencia de Phantom
  console.log('1. Phantom Detection:');
  console.log('  window.phantom exists:', !!window.phantom);
  console.log('  window.phantom.solana exists:', !!window.phantom?.solana);
  console.log('  window.phantom.solana.isPhantom:', window.phantom?.solana?.isPhantom);
  console.log('  window.solana exists:', !!window.solana);
  console.log('  window.solana.isPhantom:', window.solana?.isPhantom);
  
  // 2. Verificar propiedades de Phantom
  if (window.phantom?.solana) {
    const phantom = window.phantom.solana;
    console.log('2. Phantom Properties:');
    console.log('  isConnected:', phantom.isConnected);
    console.log('  publicKey:', phantom.publicKey?.toString() || 'null');
    console.log('  available methods:', Object.getOwnPropertyNames(phantom));
  }
  
  // 3. Intentar conexión
  if (window.phantom?.solana) {
    console.log('3. Attempting connection...');
    window.phantom.solana.connect()
      .then(response => {
        console.log('  Connection successful!');
        console.log('  Response:', response);
        console.log('  Public Key:', response.publicKey?.toString());
      })
      .catch(error => {
        console.error('  Connection failed:', error);
      });
  }
  
  // 4. Verificar todas las extensiones de wallets
  console.log('4. All Wallet Extensions:');
  const walletKeys = Object.keys(window).filter(key => 
    key.toLowerCase().includes('phantom') || 
    key.toLowerCase().includes('solana') ||
    key.toLowerCase().includes('wallet')
  );
  console.log('  Found wallet-related objects:', walletKeys);
  
  return 'Debug complete - check console output above';
}

// Ejecutar automáticamente
debugPhantomWallet();
