/**
 * Vindex Chain Governance API Routes
 * RESTful API endpoints for governance functionality
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { GovernanceEngine } from './GovernanceEngine';
import { ProposalType, VoteChoice } from './types';

interface GovernanceRequest extends Request {
  governance?: GovernanceEngine;
}

export function createGovernanceRoutes(governanceEngine: GovernanceEngine): Router {
  const router = Router();

  // Middleware to attach governance engine
  router.use((req: GovernanceRequest, res, next) => {
    req.governance = governanceEngine;
    next();
  });

  /**
   * GET /governance/stats
   * Get governance statistics
   */
  router.get('/stats', (req: GovernanceRequest, res: Response) => {
    try {
      const stats = req.governance!.getGovernanceStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /governance/proposals
   * Get proposals with pagination and filtering
   */
  router.get('/proposals', [
    query('offset').optional().isInt({ min: 0 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'active', 'passed', 'failed', 'executed', 'cancelled', 'expired']),
  ], (req: GovernanceRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as any;

      const proposals = req.governance!.getProposals(offset, limit, status);
      
      return res.json({
        success: true,
        data: {
          proposals,
          pagination: {
            offset,
            limit,
            total: proposals.length
          }
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /governance/proposals/:id
   * Get specific proposal with vote details
   */
  router.get('/proposals/:id', [
    param('id').isString().isLength({ min: 1 })
  ], (req: GovernanceRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const proposalId = req.params.id;
      const result = req.governance!.getProposal(proposalId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Proposal not found'
        });
      }

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /governance/proposals
   * Create a new proposal
   */
  router.post('/proposals', [
    body('proposer').isString().isLength({ min: 1 }),
    body('title').isString().isLength({ min: 10, max: 200 }),
    body('description').isString().isLength({ min: 50, max: 5000 }),
    body('type').isIn(['parameter', 'upgrade', 'treasury', 'emergency']),
    body('parameters').optional().isObject()
  ], async (req: GovernanceRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { proposer, title, description, type, parameters } = req.body;

      const proposalId = await req.governance!.createProposal(
        proposer,
        title,
        description,
        type as ProposalType,
        parameters
      );

      return res.status(201).json({
        success: true,
        data: {
          proposalId,
          message: 'Proposal created successfully'
        }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /governance/proposals/:id/vote
   * Cast a vote on a proposal
   */
  router.post('/proposals/:id/vote', [
    param('id').isString().isLength({ min: 1 }),
    body('voter').isString().isLength({ min: 1 }),
    body('choice').isIn(['for', 'against', 'abstain']),
    body('reason').optional().isString().isLength({ max: 500 })
  ], async (req: GovernanceRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const proposalId = req.params.id;
      const { voter, choice, reason } = req.body;

      const success = await req.governance!.castVote(
        proposalId,
        voter,
        choice as VoteChoice,
        reason
      );

      return res.json({
        success,
        data: {
          message: 'Vote cast successfully',
          proposalId,
          voter,
          choice
        }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /governance/proposals/:id/execute
   * Execute a passed proposal
   */
  router.post('/proposals/:id/execute', [
    param('id').isString().isLength({ min: 1 }),
    body('executor').isString().isLength({ min: 1 })
  ], async (req: GovernanceRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const proposalId = req.params.id;
      const { executor } = req.body;

      const success = await req.governance!.executeProposal(proposalId, executor);

      return res.json({
        success,
        data: {
          message: success ? 'Proposal executed successfully' : 'Proposal execution failed',
          proposalId,
          executor
        }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /governance/voting-power/:address
   * Get voting power for an address
   */
  router.get('/voting-power/:address', [
    param('address').isString().isLength({ min: 1 }),
    query('timestamp').optional().isInt({ min: 0 })
  ], async (req: GovernanceRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const address = req.params.address;
      const timestamp = parseInt(req.query.timestamp as string) || Date.now();

      const votingPower = await req.governance!.getVotingPowerAt(address, timestamp);

      return res.json({
        success: true,
        data: {
          address,
          timestamp,
          votingPower
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /governance/delegate
   * Delegate voting power to another address
   */
  router.post('/delegate', [
    body('delegator').isString().isLength({ min: 1 }),
    body('delegatee').isString().isLength({ min: 1 }),
    body('amount').isFloat({ min: 0.000001 })
  ], async (req: GovernanceRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { delegator, delegatee, amount } = req.body;

      const success = await req.governance!.delegateVotingPower(
        delegator,
        delegatee,
        amount
      );

      return res.json({
        success,
        data: {
          message: 'Voting power delegated successfully',
          delegator,
          delegatee,
          amount
        }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /governance/config
   * Get current governance configuration
   */
  router.get('/config', (req: GovernanceRequest, res: Response) => {
    try {
      const config = req.governance!.getConfig();
      
      return res.json({
        success: true,
        data: { config }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /governance/health
   * Health check for governance system
   */
  router.get('/health', (req: GovernanceRequest, res: Response) => {
    try {
      const stats = req.governance!.getGovernanceStats();
      const isHealthy = stats.totalProposals >= 0; // Basic health check

      return res.json({
        success: true,
        data: {
          healthy: isHealthy,
          timestamp: Date.now(),
          version: '1.0.0',
          stats: {
            totalProposals: stats.totalProposals,
            activeProposals: stats.activeProposals,
            totalVotes: stats.totalVotes
          }
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

export default createGovernanceRoutes;
