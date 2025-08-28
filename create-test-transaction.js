// Manual test of bridge transaction creation
// This simulates what happens when the createTestBridgeTransaction function is called

console.log('🧪 Creating test bridge transaction manually...');

// Simulate the function we added to the bridge
const BridgeService = {
  saveBridgeTransaction: (transaction) => {
    try {
      // Save to bridge localStorage
      let bridgeTransactions = [];
      try {
        const stored = localStorage?.getItem('vindex_bridge_transactions') || '[]';
        bridgeTransactions = JSON.parse(stored);
      } catch (e) {
        console.log('No existing bridge transactions');
      }
      
      bridgeTransactions.unshift(transaction);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('vindex_bridge_transactions', JSON.stringify(bridgeTransactions));
      }
      
      // Also save to TransactionService
      const swapTransaction = {
        id: transaction.id,
        type: 'transfer',
        from: `${transaction.fromNetwork}:${transaction.userAddress || 'user'}`,
        to: `${transaction.toNetwork}:${transaction.destinationAddress || 'user'}`,
        amount: transaction.fromAmount,
        timestamp: transaction.timestamp,
        status: transaction.status === 'completed' ? 'confirmed' : 
                transaction.status === 'failed' ? 'failed' : 'pending',
        data: {
          tokenA: transaction.fromToken,
          tokenB: transaction.toToken,
          amountIn: transaction.fromAmount,
          amountOut: transaction.toAmount,
          exchangeRate: transaction.exchangeRate,
          fee: transaction.bridgeFee
        },
        txHash: transaction.txHash,
        error: transaction.error
      };
      
      // Save to transaction service localStorage
      let vindexTransactions = [];
      try {
        const stored = localStorage?.getItem('vindex_transactions') || '[]';
        vindexTransactions = JSON.parse(stored);
      } catch (e) {
        console.log('No existing vindex transactions');
      }
      
      vindexTransactions.unshift(swapTransaction);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('vindex_transactions', JSON.stringify(vindexTransactions));
      }
      
      console.log('✅ Bridge transaction saved:', transaction.id);
      console.log('✅ Swap transaction saved:', swapTransaction.id);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save bridge transaction:', error);
      return false;
    }
  }
};

// Create test transaction
const testTransaction = {
  id: `test_${Date.now()}`,
  fromNetwork: 'VDX',
  toNetwork: 'SOL',
  fromToken: 'VDX',
  toToken: 'SOL',
  fromAmount: 100,
  toAmount: 0.5,
  status: 'pending',
  timestamp: Date.now(),
  userAddress: 'test_user_address',
  destinationAddress: 'test_destination_address',
  bridgeFee: 1,
  exchangeRate: 0.005
};

// Save the transaction
const success = BridgeService.saveBridgeTransaction(testTransaction);

if (success) {
  console.log('🎉 Test bridge transaction created successfully!');
  console.log('ID:', testTransaction.id);
  console.log('Bridge:', `${testTransaction.fromNetwork} → ${testTransaction.toNetwork}`);
  console.log('Amount:', `${testTransaction.fromAmount} ${testTransaction.fromToken}`);
  console.log('');
  console.log('✅ Transaction should now appear in both:');
  console.log('   - Bridge Activity section');
  console.log('   - Explorer Transactions tab');
  console.log('');
  console.log('🔄 Refresh the Explorer to see the transaction!');
} else {
  console.log('❌ Failed to create test transaction');
}
