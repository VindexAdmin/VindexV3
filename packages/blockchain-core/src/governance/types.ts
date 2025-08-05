/**
 * Vindex Chain Governance System
 * Core types and interfaces for decentralized governance
 */

export interface VotingPower {
  baseVDX: number;        // Raw VDX balance
  stakedVDX: number;      // Staked VDX (1.5x multiplier)
  delegatedVDX: number;   // Delegated voting power from others
  delegatedToVDX: number; // VDX delegated to others (reduces power)
  totalPower: number;     // Combined effective voting power
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  type: ProposalType;
  status: ProposalStatus;
  votingStart: number;    // Unix timestamp
  votingEnd: number;      // Unix timestamp
  executionTime?: number; // Unix timestamp for timelock
  quorumReached: boolean;
  bondAmount: number;     // VDX bond from proposer
  votes: VoteCount;
  parameters?: ProposalParameters;
  executionHash?: string; // Hash of execution transaction
  createdAt: number;
  updatedAt: number;
}

export type ProposalType = 
  | 'parameter'   // Change network parameters
  | 'upgrade'     // Protocol upgrades
  | 'treasury'    // Treasury allocation
  | 'emergency';  // Emergency actions

export type ProposalStatus = 
  | 'pending'     // Waiting for voting period
  | 'active'      // Currently accepting votes
  | 'passed'      // Passed, waiting for execution
  | 'failed'      // Failed to reach quorum or majority
  | 'executed'    // Successfully executed
  | 'cancelled'   // Cancelled by proposer or admin
  | 'expired';    // Execution window expired

export interface VoteCount {
  for: number;      // Voting power supporting
  against: number;  // Voting power opposing
  abstain: number;  // Voting power abstaining
  totalVoted: number; // Total voting power participated
}

export interface Vote {
  proposalId: string;
  voter: string;
  votingPower: number;
  choice: VoteChoice;
  timestamp: number;
  reason?: string;
  txHash?: string;
}

export type VoteChoice = 'for' | 'against' | 'abstain';

export interface ProposalParameters {
  // For parameter change proposals
  targetContract?: string;
  functionName?: string;
  newValues?: { [key: string]: any };
  
  // For treasury proposals
  recipient?: string;
  amount?: number;
  purpose?: string;
  
  // For upgrade proposals
  contractAddress?: string;
  implementationAddress?: string;
  upgradeData?: string;
}

export interface Delegation {
  delegator: string;    // Who is delegating
  delegatee: string;    // Who receives the delegation
  amount: number;       // Amount of VDX delegated
  timestamp: number;    // When delegation was created
  active: boolean;      // Is delegation currently active
}

export interface GovernanceConfig {
  // Proposal requirements
  proposalThreshold: number;    // Minimum VDX to create proposal (100,000 VDX)
  proposalBond: number;        // VDX bond required (10,000 VDX)
  
  // Voting requirements
  quorumThreshold: number;     // Minimum participation (4% = 40M VDX)
  majorityThreshold: number;   // Required majority (50%)
  
  // Timing parameters
  votingPeriod: number;        // Voting duration (7 days)
  timeLockPeriod: number;      // Execution delay (48 hours)
  gracePeriod: number;         // Grace period (24 hours)
  emergencyTimeLock: number;   // Emergency delay (6 hours)
  
  // Rewards
  votingRewardRate: number;    // Annual reward rate (0.1%)
  proposalReward: number;      // Reward for successful proposals (1,000 VDX)
  delegationRewardRate: number; // Delegation reward rate (0.05%)
  
  // Security
  minimumAccountAge: number;   // Minimum account age to vote (30 days)
  stakingVotingMultiplier: number; // Staking voting bonus (1.5x)
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVotes: number;
  totalVotingPower: number;
  averageParticipation: number;
  treasuryBalance: number;
  totalDelegated: number;
}

export interface TreasuryAllocation {
  id: string;
  proposalId: string;
  recipient: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'released' | 'cancelled';
  releaseTime: number;
  executedAt?: number;
  txHash?: string;
}

export interface GovernanceEvent {
  type: 'proposal_created' | 'vote_cast' | 'proposal_executed' | 'delegation_created' | 'treasury_allocation';
  proposalId?: string;
  voter?: string;
  data: any;
  timestamp: number;
  blockNumber: number;
  txHash: string;
}

// Default governance configuration
export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  proposalThreshold: 100_000,      // 100K VDX
  proposalBond: 10_000,           // 10K VDX
  quorumThreshold: 40_000_000,    // 40M VDX (4% of 1B supply)
  majorityThreshold: 0.5,         // 50%
  votingPeriod: 7 * 24 * 60 * 60 * 1000,  // 7 days in ms
  timeLockPeriod: 48 * 60 * 60 * 1000,    // 48 hours in ms
  gracePeriod: 24 * 60 * 60 * 1000,       // 24 hours in ms
  emergencyTimeLock: 6 * 60 * 60 * 1000,  // 6 hours in ms
  votingRewardRate: 0.001,        // 0.1% APY
  proposalReward: 1_000,          // 1K VDX
  delegationRewardRate: 0.0005,   // 0.05% APY
  minimumAccountAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  stakingVotingMultiplier: 1.5    // 1.5x multiplier for staked VDX
};

// Helper functions for governance calculations
export class GovernanceUtils {
  static calculateVotingPower(
    vdxBalance: number,
    stakedVDX: number,
    delegatedVDX: number,
    delegatedToVDX: number,
    config: GovernanceConfig
  ): VotingPower {
    const effectiveStaked = stakedVDX * config.stakingVotingMultiplier;
    const totalPower = vdxBalance + effectiveStaked + delegatedVDX - delegatedToVDX;
    
    return {
      baseVDX: vdxBalance,
      stakedVDX: stakedVDX,
      delegatedVDX: delegatedVDX,
      delegatedToVDX: delegatedToVDX,
      totalPower: Math.max(0, totalPower)
    };
  }

  static isQuorumReached(votes: VoteCount, config: GovernanceConfig): boolean {
    return votes.totalVoted >= config.quorumThreshold;
  }

  static hasProposalPassed(votes: VoteCount, config: GovernanceConfig): boolean {
    if (!this.isQuorumReached(votes, config)) {
      return false;
    }
    
    const totalDecisiveVotes = votes.for + votes.against;
    if (totalDecisiveVotes === 0) {
      return false;
    }
    
    const forPercentage = votes.for / totalDecisiveVotes;
    return forPercentage >= config.majorityThreshold;
  }

  static getProposalStatusFromVotes(
    proposal: Proposal,
    config: GovernanceConfig,
    currentTime: number
  ): ProposalStatus {
    if (currentTime < proposal.votingStart) {
      return 'pending';
    }
    
    if (currentTime < proposal.votingEnd) {
      return 'active';
    }
    
    if (proposal.status === 'executed') {
      return 'executed';
    }
    
    if (proposal.status === 'cancelled') {
      return 'cancelled';
    }
    
    // Voting has ended, determine outcome
    if (this.hasProposalPassed(proposal.votes, config)) {
      if (proposal.executionTime && currentTime >= proposal.executionTime) {
        return 'passed'; // Changed to avoid type mismatch
      }
      return 'passed';
    }
    
    return 'failed';
  }

  static calculateExecutionTime(
    proposal: Proposal,
    config: GovernanceConfig
  ): number {
    const timeLockPeriod = proposal.type === 'emergency' 
      ? config.emergencyTimeLock 
      : config.timeLockPeriod;
    
    return proposal.votingEnd + timeLockPeriod;
  }

  static calculateVotingRewards(
    votingPower: number,
    config: GovernanceConfig,
    participationDays: number
  ): number {
    const annualReward = votingPower * config.votingRewardRate;
    return (annualReward * participationDays) / 365;
  }
}

export default {
  DEFAULT_GOVERNANCE_CONFIG,
  GovernanceUtils
};
