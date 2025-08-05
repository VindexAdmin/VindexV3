/**
 * Vindex Chain Governance Engine
 * Core governance functionality for proposal management and voting
 */

import { 
  Proposal, 
  Vote, 
  VotingPower, 
  Delegation,
  ProposalType,
  ProposalStatus,
  VoteChoice,
  GovernanceConfig,
  GovernanceStats,
  TreasuryAllocation,
  DEFAULT_GOVERNANCE_CONFIG,
  GovernanceUtils
} from './types';
import { VindexBlockchain } from '../core/VindexBlockchain';
import { ProofOfStake } from '../consensus/ProofOfStake';

export class GovernanceEngine {
  private blockchain: VindexBlockchain;
  private pos: ProofOfStake;
  private config: GovernanceConfig;
  
  // Storage
  private proposals: Map<string, Proposal> = new Map();
  private votes: Map<string, Vote[]> = new Map(); // proposalId -> votes
  private delegations: Map<string, Delegation[]> = new Map(); // delegator -> delegations
  private treasuryAllocations: Map<string, TreasuryAllocation> = new Map();
  
  // Cache
  private votingPowerCache: Map<string, { power: VotingPower; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    blockchain: VindexBlockchain,
    pos: ProofOfStake,
    config: GovernanceConfig = DEFAULT_GOVERNANCE_CONFIG
  ) {
    this.blockchain = blockchain;
    this.pos = pos;
    this.config = config;
  }

  /**
   * Create a new governance proposal
   */
  public async createProposal(
    proposer: string,
    title: string,
    description: string,
    type: ProposalType,
    parameters?: any
  ): Promise<string> {
    // Validate proposer eligibility
    await this.validateProposer(proposer);
    
    // Generate proposal ID
    const proposalId = this.generateProposalId(proposer, title);
    
    // Calculate voting period
    const now = Date.now();
    const votingStart = now + (24 * 60 * 60 * 1000); // Start in 24 hours
    const votingEnd = votingStart + this.config.votingPeriod;
    
    // Create proposal
    const proposal: Proposal = {
      id: proposalId,
      title,
      description,
      proposer,
      type,
      status: 'pending',
      votingStart,
      votingEnd,
      executionTime: undefined,
      quorumReached: false,
      bondAmount: this.config.proposalBond,
      votes: {
        for: 0,
        against: 0,
        abstain: 0,
        totalVoted: 0
      },
      parameters,
      createdAt: now,
      updatedAt: now
    };

    // Lock proposer's bond
    await this.lockProposalBond(proposer, this.config.proposalBond);
    
    // Store proposal
    this.proposals.set(proposalId, proposal);
    this.votes.set(proposalId, []);
    
    console.log(`Governance: Proposal ${proposalId} created by ${proposer}`);
    return proposalId;
  }

  /**
   * Cast a vote on a proposal
   */
  public async castVote(
    proposalId: string,
    voter: string,
    choice: VoteChoice,
    reason?: string
  ): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    // Validate voting eligibility
    await this.validateVoter(voter, proposal);
    
    // Check if already voted
    const existingVotes = this.votes.get(proposalId) || [];
    const existingVote = existingVotes.find(v => v.voter === voter);
    if (existingVote) {
      throw new Error(`Voter ${voter} has already voted on proposal ${proposalId}`);
    }

    // Calculate voting power at proposal creation time
    const votingPower = await this.getVotingPowerAt(voter, proposal.createdAt);
    if (votingPower.totalPower === 0) {
      throw new Error(`Voter ${voter} has no voting power`);
    }

    // Create vote
    const vote: Vote = {
      proposalId,
      voter,
      votingPower: votingPower.totalPower,
      choice,
      timestamp: Date.now(),
      reason
    };

    // Store vote
    existingVotes.push(vote);
    this.votes.set(proposalId, existingVotes);

    // Update proposal vote counts
    this.updateProposalVoteCounts(proposalId);

    console.log(`Governance: Vote cast by ${voter} on proposal ${proposalId}: ${choice}`);
    return true;
  }

  /**
   * Delegate voting power to another address
   */
  public async delegateVotingPower(
    delegator: string,
    delegatee: string,
    amount: number
  ): Promise<boolean> {
    // Validate delegation
    if (delegator === delegatee) {
      throw new Error('Cannot delegate to yourself');
    }

    const delegatorBalance = await this.blockchain.getBalance(delegator);
    if (delegatorBalance < amount) {
      throw new Error('Insufficient balance for delegation');
    }

    // Check existing delegations
    const existingDelegations = this.delegations.get(delegator) || [];
    const totalDelegated = existingDelegations
      .filter(d => d.active)
      .reduce((sum, d) => sum + d.amount, 0);

    if (totalDelegated + amount > delegatorBalance) {
      throw new Error('Cannot delegate more than available balance');
    }

    // Create delegation
    const delegation: Delegation = {
      delegator,
      delegatee,
      amount,
      timestamp: Date.now(),
      active: true
    };

    existingDelegations.push(delegation);
    this.delegations.set(delegator, existingDelegations);

    // Clear voting power cache
    this.clearVotingPowerCache([delegator, delegatee]);

    console.log(`Governance: ${delegator} delegated ${amount} VDX to ${delegatee}`);
    return true;
  }

  /**
   * Execute a passed proposal
   */
  public async executeProposal(proposalId: string, executor: string): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    // Validate execution eligibility
    const now = Date.now();
    const currentStatus = GovernanceUtils.getProposalStatusFromVotes(proposal, this.config, now);
    
    if (currentStatus !== 'passed') {
      throw new Error(`Proposal ${proposalId} is not ready for execution. Status: ${currentStatus}`);
    }

    if (!proposal.executionTime) {
      proposal.executionTime = GovernanceUtils.calculateExecutionTime(proposal, this.config);
    }

    if (now < proposal.executionTime) {
      throw new Error(`Proposal ${proposalId} is still in timelock period`);
    }

    // Execute proposal based on type
    let executionResult = false;
    
    try {
      switch (proposal.type) {
        case 'parameter':
          executionResult = await this.executeParameterChange(proposal);
          break;
        case 'treasury':
          executionResult = await this.executeTreasuryAllocation(proposal);
          break;
        case 'upgrade':
          executionResult = await this.executeUpgrade(proposal);
          break;
        case 'emergency':
          executionResult = await this.executeEmergencyAction(proposal);
          break;
        default:
          throw new Error(`Unknown proposal type: ${proposal.type}`);
      }

      if (executionResult) {
        proposal.status = 'executed';
        proposal.updatedAt = now;
        
        // Release proposer bond + reward
        await this.releaseProposalBond(proposal.proposer, proposal.bondAmount + this.config.proposalReward);
        
        console.log(`Governance: Proposal ${proposalId} executed successfully`);
      }
      
    } catch (error) {
      console.error(`Governance: Failed to execute proposal ${proposalId}:`, error);
      proposal.status = 'failed';
      proposal.updatedAt = now;
    }

    return executionResult;
  }

  /**
   * Get voting power for an address at a specific time
   */
  public async getVotingPowerAt(address: string, timestamp: number): Promise<VotingPower> {
    // Check cache first
    const cacheKey = `${address}_${timestamp}`;
    const cached = this.votingPowerCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.power;
    }

    // Calculate voting power
    const vdxBalance = await this.blockchain.getBalance(address);
    const stakedVDX = this.getStakedAmount(address);
    const delegatedVDX = this.getDelegatedToAmount(address);
    const delegatedToVDX = this.getDelegatedFromAmount(address);

    const votingPower = GovernanceUtils.calculateVotingPower(
      vdxBalance,
      stakedVDX,
      delegatedVDX,
      delegatedToVDX,
      this.config
    );

    // Cache result
    this.votingPowerCache.set(cacheKey, { power: votingPower, timestamp: Date.now() });

    return votingPower;
  }

  /**
   * Get current governance configuration
   */
  public getConfig(): GovernanceConfig {
    return { ...this.config };
  }

  /**
   * Get current governance statistics
   */
  public getGovernanceStats(): GovernanceStats {
    const totalProposals = this.proposals.size;
    const activeProposals = Array.from(this.proposals.values())
      .filter(p => p.status === 'active').length;
    
    const allVotes = Array.from(this.votes.values()).flat();
    const totalVotes = allVotes.length;
    
    const totalVotingPower = allVotes.reduce((sum, v) => sum + v.votingPower, 0);
    const averageParticipation = totalProposals > 0 ? totalVotingPower / totalProposals : 0;
    
    const treasuryBalance = this.getTreasuryBalance();
    const totalDelegated = this.getTotalDelegatedAmount();

    return {
      totalProposals,
      activeProposals,
      totalVotes,
      totalVotingPower,
      averageParticipation,
      treasuryBalance,
      totalDelegated
    };
  }

  /**
   * Get all proposals with pagination
   */
  public getProposals(
    offset: number = 0,
    limit: number = 20,
    status?: ProposalStatus
  ): Proposal[] {
    let proposals = Array.from(this.proposals.values());
    
    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }
    
    // Sort by creation time (newest first)
    proposals.sort((a, b) => b.createdAt - a.createdAt);
    
    return proposals.slice(offset, offset + limit);
  }

  /**
   * Get proposal by ID with vote details
   */
  public getProposal(proposalId: string): { proposal: Proposal; votes: Vote[] } | null {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return null;
    }

    const votes = this.votes.get(proposalId) || [];
    return { proposal, votes };
  }

  // Private helper methods

  private async validateProposer(proposer: string): Promise<void> {
    const balance = await this.blockchain.getBalance(proposer);
    if (balance < this.config.proposalThreshold) {
      throw new Error(`Proposer needs at least ${this.config.proposalThreshold} VDX`);
    }

    if (balance < this.config.proposalBond) {
      throw new Error(`Proposer needs at least ${this.config.proposalBond} VDX for bond`);
    }

    // Check account age
    const accountAge = await this.getAccountAge(proposer);
    if (accountAge < this.config.minimumAccountAge) {
      throw new Error(`Account must be at least ${this.config.minimumAccountAge / (24 * 60 * 60 * 1000)} days old`);
    }
  }

  private async validateVoter(voter: string, proposal: Proposal): Promise<void> {
    const now = Date.now();
    
    if (now < proposal.votingStart) {
      throw new Error('Voting has not started yet');
    }
    
    if (now > proposal.votingEnd) {
      throw new Error('Voting period has ended');
    }

    if (proposal.status !== 'active' && proposal.status !== 'pending') {
      throw new Error(`Proposal is ${proposal.status} and not accepting votes`);
    }

    const accountAge = await this.getAccountAge(voter);
    if (accountAge < this.config.minimumAccountAge) {
      throw new Error(`Account must be at least ${this.config.minimumAccountAge / (24 * 60 * 60 * 1000)} days old to vote`);
    }
  }

  private generateProposalId(proposer: string, title: string): string {
    const timestamp = Date.now();
    const hash = Buffer.from(`${proposer}_${title}_${timestamp}`).toString('base64');
    return `prop_${hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
  }

  private updateProposalVoteCounts(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    const votes = this.votes.get(proposalId);
    
    if (!proposal || !votes) return;

    const voteCounts = votes.reduce(
      (acc, vote) => {
        acc[vote.choice] += vote.votingPower;
        acc.totalVoted += vote.votingPower;
        return acc;
      },
      { for: 0, against: 0, abstain: 0, totalVoted: 0 }
    );

    proposal.votes = voteCounts;
    proposal.quorumReached = GovernanceUtils.isQuorumReached(voteCounts, this.config);
    proposal.updatedAt = Date.now();

    // Update status if voting ended
    const now = Date.now();
    if (now > proposal.votingEnd) {
      proposal.status = GovernanceUtils.getProposalStatusFromVotes(proposal, this.config, now);
      if (proposal.status === 'passed') {
        proposal.executionTime = GovernanceUtils.calculateExecutionTime(proposal, this.config);
      }
    }
  }

  private getStakedAmount(address: string): number {
    // Get staked amount from PoS system
    const stakingInfo = this.pos.getStakingInfo(address);
    if (!stakingInfo || stakingInfo.length === 0) {
      return 0;
    }
    
    // Sum all staking amounts for this address
    return stakingInfo.reduce((total, stake) => total + stake.stakedAmount, 0);
  }

  private getDelegatedToAmount(address: string): number {
    // Calculate total VDX delegated TO this address
    let total = 0;
    for (const [, delegations] of this.delegations) {
      for (const delegation of delegations) {
        if (delegation.delegatee === address && delegation.active) {
          total += delegation.amount;
        }
      }
    }
    return total;
  }

  private getDelegatedFromAmount(address: string): number {
    // Calculate total VDX delegated FROM this address
    const delegations = this.delegations.get(address) || [];
    return delegations
      .filter(d => d.active)
      .reduce((sum, d) => sum + d.amount, 0);
  }

  private clearVotingPowerCache(addresses: string[]): void {
    for (const address of addresses) {
      for (const key of this.votingPowerCache.keys()) {
        if (key.startsWith(address + '_')) {
          this.votingPowerCache.delete(key);
        }
      }
    }
  }

  private async getAccountAge(address: string): Promise<number> {
    // Get first transaction timestamp for this address
    // This is a simplified implementation
    return Date.now() - (30 * 24 * 60 * 60 * 1000); // Mock: 30 days old
  }

  private async lockProposalBond(proposer: string, amount: number): Promise<void> {
    // Lock VDX as proposal bond - simplified implementation
    console.log(`Locking ${amount} VDX as bond for ${proposer}`);
  }

  private async releaseProposalBond(proposer: string, amount: number): Promise<void> {
    // Release VDX bond + reward - simplified implementation
    console.log(`Releasing ${amount} VDX bond + reward to ${proposer}`);
  }

  private getTreasuryBalance(): number {
    // Get current treasury balance - simplified implementation
    return 50_000_000; // Mock: 50M VDX initial treasury
  }

  private getTotalDelegatedAmount(): number {
    let total = 0;
    for (const [, delegations] of this.delegations) {
      for (const delegation of delegations) {
        if (delegation.active) {
          total += delegation.amount;
        }
      }
    }
    return total;
  }

  // Execution methods for different proposal types

  private async executeParameterChange(proposal: Proposal): Promise<boolean> {
    console.log(`Executing parameter change: ${proposal.id}`);
    // Implementation for parameter changes
    return true;
  }

  private async executeTreasuryAllocation(proposal: Proposal): Promise<boolean> {
    console.log(`Executing treasury allocation: ${proposal.id}`);
    // Implementation for treasury allocations
    return true;
  }

  private async executeUpgrade(proposal: Proposal): Promise<boolean> {
    console.log(`Executing upgrade: ${proposal.id}`);
    // Implementation for protocol upgrades
    return true;
  }

  private async executeEmergencyAction(proposal: Proposal): Promise<boolean> {
    console.log(`Executing emergency action: ${proposal.id}`);
    // Implementation for emergency actions
    return true;
  }
}
