/**
 * Vindex Chain Governance System
 * Main exports for governance functionality
 */

export * from './types';
export { GovernanceEngine } from './GovernanceEngine';
export { default as createGovernanceRoutes } from './routes';

// Re-export commonly used types and utilities
export {
  DEFAULT_GOVERNANCE_CONFIG,
  GovernanceUtils
} from './types';
