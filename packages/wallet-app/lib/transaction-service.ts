/**
 * Vindex Transaction Service
 * Maneja las transacciones tanto en localStorage como en el blockchain
 */

export interface SwapTransaction {
  id: string;
  type: 'swap' | 'transfer' | 'stake' | 'unstake';
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  data?: {
    tokenA?: string;
    tokenB?: string;
    amountIn?: number;
    amountOut?: number;
    slippage?: number;
    exchangeRate?: number;
    fee?: number;
  };
  txHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  error?: string;
}

export interface BlockchainTransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: string;
  timestamp: number;
  status: string;
  blockNumber?: number;
  gasUsed?: number;
}

export class TransactionService {
  private static readonly STORAGE_KEY = 'vindex_transactions';
  private static readonly MAX_LOCAL_TRANSACTIONS = 50;

  /**
   * Guarda una transacción en localStorage
   */
  static saveTransaction(transaction: SwapTransaction): void {
    try {
      const existingTransactions = this.getLocalTransactions();
      
      // Agregar la nueva transacción al principio
      const updatedTransactions = [transaction, ...existingTransactions];
      
      // Mantener solo las últimas MAX_LOCAL_TRANSACTIONS
      const trimmedTransactions = updatedTransactions.slice(0, this.MAX_LOCAL_TRANSACTIONS);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedTransactions));
      
      // Disparar evento personalizado para que otras páginas se actualicen
      window.dispatchEvent(new CustomEvent('vindexTransactionUpdate', {
        detail: { transaction, allTransactions: trimmedTransactions }
      }));
      
    } catch (error) {
      console.error('Error saving transaction to localStorage:', error);
    }
  }

  /**
   * Obtiene todas las transacciones locales
   */
  static getLocalTransactions(): SwapTransaction[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading transactions from localStorage:', error);
      return [];
    }
  }

  /**
   * Actualiza el estado de una transacción específica
   */
  static updateTransactionStatus(
    transactionId: string, 
    status: 'pending' | 'confirmed' | 'failed',
    additionalData?: Partial<SwapTransaction>
  ): void {
    try {
      const transactions = this.getLocalTransactions();
      const index = transactions.findIndex(tx => tx.id === transactionId);
      
      if (index !== -1) {
        transactions[index] = {
          ...transactions[index],
          status,
          ...additionalData
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
        
        // Disparar evento de actualización
        window.dispatchEvent(new CustomEvent('vindexTransactionUpdate', {
          detail: { 
            transaction: transactions[index], 
            allTransactions: transactions,
            updated: true
          }
        }));
      }
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  }

  /**
   * Convierte transacciones del blockchain al formato local
   */
  static convertBlockchainTransaction(blockchainTx: BlockchainTransaction): SwapTransaction {
    return {
      id: blockchainTx.id,
      type: blockchainTx.type as any || 'transfer',
      from: blockchainTx.from,
      to: blockchainTx.to,
      amount: blockchainTx.amount,
      timestamp: blockchainTx.timestamp,
      status: blockchainTx.status as any || 'confirmed',
      txHash: blockchainTx.id,
      blockNumber: blockchainTx.blockNumber,
      gasUsed: blockchainTx.gasUsed
    };
  }

  /**
   * Combina transacciones locales y del blockchain, eliminando duplicados
   */
  static combineTransactions(
    localTransactions: SwapTransaction[], 
    blockchainTransactions: BlockchainTransaction[]
  ): SwapTransaction[] {
    // Convertir transacciones del blockchain
    const convertedBlockchain = blockchainTransactions.map(tx => 
      this.convertBlockchainTransaction(tx)
    );
    
    // Crear un map para evitar duplicados
    const transactionMap = new Map<string, SwapTransaction>();
    
    // Agregar transacciones locales primero (tienen prioridad por tener más datos)
    localTransactions.forEach(tx => {
      transactionMap.set(tx.id, tx);
    });
    
    // Agregar transacciones del blockchain que no estén ya presentes
    convertedBlockchain.forEach(tx => {
      if (!transactionMap.has(tx.id)) {
        transactionMap.set(tx.id, tx);
      } else {
        // Si existe, actualizar con datos del blockchain
        const existing = transactionMap.get(tx.id)!;
        transactionMap.set(tx.id, {
          ...existing,
          status: tx.status,
          txHash: tx.txHash,
          blockNumber: tx.blockNumber,
          gasUsed: tx.gasUsed
        });
      }
    });
    
    // Convertir de vuelta a array y ordenar por timestamp
    return Array.from(transactionMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Limpia transacciones antiguas
   */
  static cleanOldTransactions(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    try {
      const transactions = this.getLocalTransactions();
      const now = Date.now();
      
      const filteredTransactions = transactions.filter(tx => 
        (now - tx.timestamp) < maxAge
      );
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredTransactions));
    } catch (error) {
      console.error('Error cleaning old transactions:', error);
    }
  }

  /**
   * Genera un ID único para transacciones
   */
  static generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Suscribirse a actualizaciones de transacciones
   */
  static onTransactionUpdate(callback: (event: CustomEvent) => void): () => void {
    window.addEventListener('vindexTransactionUpdate', callback as EventListener);
    
    // Retornar función para cancelar la suscripción
    return () => {
      window.removeEventListener('vindexTransactionUpdate', callback as EventListener);
    };
  }
}

export default TransactionService;
