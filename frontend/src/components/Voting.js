import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';


const Voting = ({ contract, account }) => {
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [votingState, setVotingState] = useState(0);
  const [userVoteStatus, setUserVoteStatus] = useState({ registered: false, voted: false });
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (contract && account) {
      loadVotingData();
    }
  }, [contract, account]);

  const loadVotingData = async () => {
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

      // Load user status
      const registered = await contract.isVoterRegistered(account);
      const voted = await contract.hasVoted(account);
      setUserVoteStatus({ registered, voted });

    } catch (error) {
      console.error('Error loading voting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseRevertReason = (error) => {
    const m = (error && (error.shortMessage || error.reason || error.message || '')) || '';
    const inner = error?.info?.error?.message || error?.data?.message || error?.error?.message || '';
    const text = `${m} ${inner}`.toLowerCase();
    if (text.includes('voting is not active')) return 'Voting is not active';
    if (text.includes('voter not registered')) return 'You are not registered';
    if (text.includes('already voted')) return 'You have already voted';
    if (text.includes('invalid party id')) return 'Invalid party selected';
    if (text.includes('party does not exist')) return 'Selected party does not exist';
    return null;
  };

  const handleVote = async () => {
    if (selectedParty === null) {
      toast.error('Please select a party to vote for', { toastId: 'select-party' });
      return;
    }

    try {
      setVoting(true);

      // Preflight checks to avoid on-chain reverts
      const stateNow = await contract.getVotingState();
      if (stateNow !== 1) {
        toast.error('Voting is not active', { toastId: 'vote-not-active' });
        await loadVotingData();
        return;
      }
      const reg = await contract.isVoterRegistered(account);
      if (!reg) {
        toast.error('You are not registered', { toastId: 'vote-not-registered' });
        await loadVotingData();
        return;
      }
      const done = await contract.hasVoted(account);
      if (done) {
        toast.info('You have already voted', { toastId: 'vote-already' });
        await loadVotingData();
        return;
      }

      // Cast the vote
      const receipt = await contract.castVote(selectedParty);

      if (Number(receipt?.status) === 1) {
        toast.success('Your vote has been cast successfully!', { toastId: 'vote-success' });
        setUserVoteStatus(prev => ({ ...prev, voted: true }));
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      throw new Error('Transaction failed');

    } catch (error) {
      console.error('Error casting vote:', error);
      // If the chain already recorded the vote, treat as success to avoid false error
      try {
        const votedNow = await contract.hasVoted(account);
        if (votedNow) {
          toast.success('Your vote has been cast successfully!', { toastId: 'vote-success' });
          setUserVoteStatus(prev => ({ ...prev, voted: true }));
          setTimeout(() => navigate('/'), 1000);
          return;
        }
      } catch {}

      const reason = parseRevertReason(error);
      if (reason) {
        toast.error(`Failed to cast vote: ${reason}`, { toastId: 'vote-failed' });
      } else {
        toast.error('Failed to cast vote. Please try again.', { toastId: 'vote-failed' });
      }
      await loadVotingData();
    } finally {
      setVoting(false);
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

  const getPartyIcon = (id) => {
    switch (id) {
      case 0: return '🐴'; // Democrats
      case 1: return '🐘'; // Republicans
      default: return '🚀'; // American Party or others
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading voting interface...</div>
      </div>
    );
  }

  // Check if user can vote
  if (!userVoteStatus.registered) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-effect rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-4">Not Registered to Vote</h2>
          <p className="text-white/80 mb-6">
            You need to be registered by an administrator to participate in this election.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (userVoteStatus.voted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-effect rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-4">Vote Already Cast</h2>
          <p className="text-white/80 mb-6">
            You have already cast your vote in this election. Thank you for participating!
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (votingState !== 1) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-effect rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-white mb-4">Voting is {getVotingStateText(votingState)}</h2>
          <p className="text-white/80 mb-6">
            {votingState === 0 
              ? 'Voting has not started yet. Please wait for the administrator to start the election.'
              : 'Voting has ended. Thank you for your participation!'
            }
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Cast Your Vote</h1>
        <p className="text-white/80 text-lg">
          Select your preferred candidate. Your vote will be encrypted using FHE technology.
        </p>
      </div>

      {/* Voting Status */}
      <div className="glass-effect rounded-xl p-6 mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
            <span className="text-green-300 text-sm font-medium">Voting Active</span>
          </div>
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2">
            <span className="text-blue-300 text-sm font-medium">FHE Encrypted</span>
          </div>
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2">
            <span className="text-purple-300 text-sm font-medium">Private & Secure</span>
          </div>
        </div>
      </div>

      {/* Party Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {parties.map((party) => (
          <div
            key={party.id}
            onClick={() => setSelectedParty(party.id)}
            className={`vote-card cursor-pointer rounded-xl p-6 border-2 transition-all duration-200 ${
              selectedParty === party.id
                ? 'border-blue-400 bg-blue-500/20'
                : 'border-white/20 bg-white/5 hover:border-white/40'
            }`}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">{getPartyIcon(party.id)}</div>
              <h3 className="text-xl font-bold text-white mb-2">{party.name}</h3>
              <p className="text-white/70 mb-4">Candidate</p>
              <p className="text-lg font-semibold text-blue-300">{party.candidateName}</p>
              
              {selectedParty === party.id && (
                <div className="mt-4">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1 inline-block">
                    <span className="text-blue-300 text-sm font-medium">Selected</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Vote Button */}
      <div className="text-center">
        <button
          onClick={handleVote}
          disabled={selectedParty === null || voting}
          className={`font-medium py-3 px-8 rounded-lg transition-all duration-200 transform ${
            selectedParty !== null && !voting
              ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white hover:scale-105'
              : 'bg-gray-500 text-gray-300 cursor-not-allowed'
          }`}
        >
          {voting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Casting Vote...</span>
            </div>
          ) : (
            'Cast My Vote'
          )}
        </button>
      </div>

    </div>
  );
};

export default Voting;
