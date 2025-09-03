import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const Admin = ({ contract, account, isAdmin }) => {
  const [votingState, setVotingState] = useState(0);
  const [parties, setParties] = useState([]);
  const [registeredVoters, setRegisteredVoters] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [newVoterAddress, setNewVoterAddress] = useState('');
  const [newPartyName, setNewPartyName] = useState('');
  const [newCandidateName, setNewCandidateName] = useState('');
  const [votingDuration, setVotingDuration] = useState(60);
  const [bulkVoterAddresses, setBulkVoterAddresses] = useState('');

  useEffect(() => {
    if (contract && isAdmin) {
      loadAdminData();
    }
  }, [contract, isAdmin]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load voting state
      const state = await contract.getVotingState();
      setVotingState(state);

      // Load parties
      const partyCount = await contract.getPartyCount();
      const partiesData = [];
      for (let i = 0; i < partyCount; i++) {
        const party = await contract.getParty(i);
        partiesData.push({
          id: i,
          name: party.name,
          candidateName: party.candidateName,
        });
      }
      setParties(partiesData);

      // Load total votes
      const total = await contract.getTotalVotes();
      setTotalVotes(total);

      // Load registered voters count
      const registered = await contract.getRegisteredVotersCount();
      setRegisteredVoters(Array(registered).fill(null)); // Simplified for demo

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartVoting = async () => {
    try {
      await contract.startVoting(votingDuration);
      toast.success(`Voting started for ${votingDuration} minutes`);
      loadAdminData();
    } catch (error) {
      console.error('Error starting voting:', error);
      toast.error('Failed to start voting');
    }
  };

  const announceResults = async () => {
    try {
      const total = await contract.getTotalVotes();
      const count = await contract.getPartyCount();
      const data = [];
      for (let i = 0; i < count; i++) {
        const party = await contract.getParty(i);
        const votes = await contract.getVoteCount(i);
        data.push({ id: i, name: party.name, candidateName: party.candidateName, voteCount: Number(votes) });
      }
      if (Number(total) === 0) {
        toast.info('Election ended with no votes cast');
        return;
      }
      let max = 0;
      for (const p of data) max = Math.max(max, p.voteCount);
      const winners = data.filter(p => p.voteCount === max);
      if (winners.length === 1) {
        const w = winners[0];
        toast.success(`Winner: ${w.name} - ${w.candidateName} (${max} votes)`);
      } else {
        toast.info(`Tie: ${winners.map(w => `${w.name} (${w.candidateName})`).join(' • ')} with ${max} votes each`);
      }
    } catch (e) {
      console.error('Error announcing results:', e);
    }
  };

  const handleEndVoting = async () => {
    try {
      await contract.endVoting();
      await contract.publishResults();
      toast.success('Voting ended and results published');
      await loadAdminData();
      await announceResults();
    } catch (error) {
      console.error('Error ending voting:', error);
      toast.error('Failed to end voting');
    }
  };

  const handleRegisterVoter = async () => {
    if (!newVoterAddress) {
      toast.error('Please enter a voter address');
      return;
    }

    try {
      await contract.registerVoter(newVoterAddress);
      toast.success('Voter registered successfully');
      setNewVoterAddress('');
      loadAdminData();
    } catch (error) {
      console.error('Error registering voter:', error);
      toast.error('Failed to register voter');
    }
  };

  const handleRegisterBulkVoters = async () => {
    if (!bulkVoterAddresses.trim()) {
      toast.error('Please enter voter addresses');
      return;
    }

    try {
      const addresses = bulkVoterAddresses
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);

      if (addresses.length === 0) {
        toast.error('No valid addresses found');
        return;
      }

      await contract.registerMultipleVoters(addresses);
      toast.success(`${addresses.length} voters registered successfully`);
      setBulkVoterAddresses('');
      loadAdminData();
    } catch (error) {
      console.error('Error registering bulk voters:', error);
      toast.error('Failed to register voters');
    }
  };

  const handleAddParty = async () => {
    if (!newPartyName || !newCandidateName) {
      toast.error('Please enter both party name and candidate name');
      return;
    }

    try {
      await contract.addParty(newPartyName, newCandidateName);
      toast.success('Party added successfully');
      setNewPartyName('');
      setNewCandidateName('');
      loadAdminData();
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('Failed to add party');
    }
  };

  const getVotingStateText = (state) => {
    switch (state) {
      case 0: return 'Not Started';
      case 1: return 'Active';
      case 2: return 'Ended';
      default: return 'Unknown';
    }
  };

  const getVotingStateColor = (state) => {
    switch (state) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-green-400';
      case 2: return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-effect rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white/80">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Admin Panel</h1>
        <p className="text-white/80 text-lg">
          Manage the USA 2028 Presidential Election
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-effect rounded-xl p-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">
            {getVotingStateText(votingState)}
          </div>
          <div className={`text-sm font-medium ${getVotingStateColor(votingState)}`}>
            Voting Status
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">
            {totalVotes}
          </div>
          <div className="text-sm font-medium text-blue-300">
            Total Votes Cast
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">
            {registeredVoters.length}
          </div>
          <div className="text-sm font-medium text-green-300">
            Registered Voters
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">
            {parties.length}
          </div>
          <div className="text-sm font-medium text-purple-300">
            Political Parties
          </div>
        </div>
      </div>

      {/* Voting Control */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Voting Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {votingState === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Voting Duration (minutes)
                </label>
                <input
                  type="number"
                  value={votingDuration}
                  onChange={(e) => setVotingDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                  min="1"
                  max="1440"
                />
              </div>
              <button
                onClick={handleStartVoting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Start Voting
              </button>
            </div>
          )}
          
          {votingState === 1 && (
            <button
              onClick={handleEndVoting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              End Voting
            </button>
          )}
        </div>
      </div>

      {/* Voter Registration */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Voter Registration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Single Voter Registration */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white">Register Single Voter</h4>
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Voter Address
              </label>
              <input
                type="text"
                value={newVoterAddress}
                onChange={(e) => setNewVoterAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              onClick={handleRegisterVoter}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Register Voter
            </button>
          </div>

          {/* Bulk Voter Registration */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white">Register Multiple Voters</h4>
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Voter Addresses (one per line)
              </label>
              <textarea
                value={bulkVoterAddresses}
                onChange={(e) => setBulkVoterAddresses(e.target.value)}
                placeholder="0x...&#10;0x...&#10;0x..."
                rows="4"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              onClick={handleRegisterBulkVoters}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Register Voters
            </button>
          </div>
        </div>
      </div>

      {/* Party Management */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Party Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Party Name
              </label>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="Party Name"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Candidate Name
              </label>
              <input
                type="text"
                value={newCandidateName}
                onChange={(e) => setNewCandidateName(e.target.value)}
                placeholder="Candidate Name"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              onClick={handleAddParty}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add Party
            </button>
          </div>

          <div>
            <h4 className="text-lg font-medium text-white mb-4">Current Parties</h4>
            <div className="space-y-3">
              {parties.map((party) => (
                <div key={party.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-white font-medium">{party.name}</div>
                  <div className="text-white/70 text-sm">Candidate: {party.candidateName}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-white/80 mb-2">Contract Address:</div>
            <div className="text-white font-mono bg-white/5 rounded px-2 py-1">
              {contract?.contractAddress || 'Not connected'}
            </div>
          </div>
          <div>
            <div className="text-white/80 mb-2">Admin Address:</div>
            <div className="text-white font-mono bg-white/5 rounded px-2 py-1">
              {account || 'Not connected'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
