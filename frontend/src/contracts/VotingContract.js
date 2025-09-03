import { ethers } from 'ethers';
import CONTRACT_ABI from './contractABI.json';

export class VotingContract {
  constructor(signer) {
    this.contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    this.contract = new ethers.Contract(this.contractAddress, CONTRACT_ABI, signer);
    this.signer = signer;
  }

  // Get contract owner
  async getOwner() {
    return await this.contract.owner();
  }

  // Get voting state
  async getVotingState() {
    const state = await this.contract.getVotingState();
    return Number(state);
  }

  // Get party information
  async getParty(partyId) {
    const party = await this.contract.getParty(partyId);
    return {
      name: party[0],
      candidateName: party[1],
      exists: party[2]
    };
  }

  // Get total party count
  async getPartyCount() {
    const count = await this.contract.getPartyCount();
    return Number(count);
  }

  // Check if voter is registered
  async isVoterRegistered(voterAddress) {
    return await this.contract.isVoterRegistered(voterAddress);
  }

  // Check if voter has voted
  async hasVoted(voterAddress) {
    return await this.contract.hasVoted(voterAddress);
  }

  // Get total votes
  async getTotalVotes() {
    const votes = await this.contract.getTotalVotes();
    return Number(votes);
  }

  // Get registered voters count
  async getRegisteredVotersCount() {
    const count = await this.contract.getRegisteredVotersCount();
    return Number(count);
  }

  // Get vote count for a party
  async getVoteCount(partyId) {
    const count = await this.contract.getVoteCount(partyId);
    return Number(count);
  }

  // Cast a vote
  async castVote(partyId) {
    const tx = await this.contract.castVote(partyId);
    return await tx.wait();
  }

  // Admin functions
  async startVoting(durationInMinutes) {
    const tx = await this.contract.startVoting(durationInMinutes);
    return await tx.wait();
  }

  async endVoting() {
    const tx = await this.contract.endVoting();
    return await tx.wait();
  }

  async publishResults() {
    const tx = await this.contract.publishResults();
    return await tx.wait();
  }

  async registerVoter(voterAddress) {
    const tx = await this.contract.registerVoter(voterAddress);
    return await tx.wait();
  }

  async registerMultipleVoters(voterAddresses) {
    const tx = await this.contract.registerMultipleVoters(voterAddresses);
    return await tx.wait();
  }

  async addParty(name, candidate) {
    const tx = await this.contract.addParty(name, candidate);
    return await tx.wait();
  }

  async resultsPublished() {
    return await this.contract.resultsPublished();
  }

  // Listen to events
  onVotingStarted(callback) {
    this.contract.on('VotingStarted', callback);
  }

  onVotingEnded(callback) {
    this.contract.on('VotingEnded', callback);
  }

  onVoteCast(callback) {
    this.contract.on('VoteCast', callback);
  }

  onVoterRegistered(callback) {
    this.contract.on('VoterRegistered', callback);
  }

  // Remove event listeners
  removeAllListeners() {
    this.contract.removeAllListeners();
  }
}
