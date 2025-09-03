import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import ConfettiBurst from './ConfettiBurst';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const Dashboard = ({ contract, account, isAdmin }) => {
  const [votingState, setVotingState] = useState(0); // 0: NOT_STARTED, 1: ACTIVE, 2: ENDED
  const [parties, setParties] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [registeredVoters, setRegisteredVoters] = useState(0);
  const [userVoteStatus, setUserVoteStatus] = useState({ registered: false, voted: false });
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ status: 'pending', winners: [], maxVotes: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

  const eventToastRef = useRef({ started: false, ended: false });
  const endedEventRef = useRef(false);
  const confettiPlayedRef = useRef(false);

  useEffect(() => {
    if (!contract) return;

    let isMounted = true;
    loadDashboardData();

    const onStarted = () => {
      if (!eventToastRef.current.started) {
        toast.info('Voting has started!', { toastId: 'voting-started' });
        eventToastRef.current.started = true;
        eventToastRef.current.ended = false;
      }
      loadDashboardData();
    };

    const onEnded = () => {
      if (!eventToastRef.current.ended) {
        toast.info('Voting has ended!', { toastId: 'voting-ended' });
        eventToastRef.current.ended = true;
        eventToastRef.current.started = false;
      }
      endedEventRef.current = true;
      loadDashboardData();
    };

    const onVoteCast = () => {
      // Do not show a toast for each vote to avoid noise; just refresh data
      loadDashboardData();
    };

    const onRegistered = () => {
      loadDashboardData();
    };

    // Clear any existing listeners before adding new ones
    contract.removeAllListeners();
    contract.onVotingStarted(onStarted);
    contract.onVotingEnded(onEnded);
    contract.onVoteCast(onVoteCast);
    contract.onVoterRegistered(onRegistered);

    return () => {
      if (isMounted) {
        contract.removeAllListeners();
        isMounted = false;
      }
    };
  }, [contract, account]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const state = await contract.getVotingState();
      setVotingState(state);

      const partyCount = await contract.getPartyCount();
      const partiesData = [];
      for (let i = 0; i < partyCount; i++) {
        const party = await contract.getParty(i);
        const voteCount = await contract.getVoteCount(i);
        partiesData.push({ id: i, name: party.name, candidateName: party.candidateName, voteCount });
      }
      setParties(partiesData);

      const total = await contract.getTotalVotes();
      setTotalVotes(total);

      const regCount = await contract.getRegisteredVotersCount();
      setRegisteredVoters(regCount);

      if (account) {
        const isReg = await contract.isVoterRegistered(account);
        const hasV = await contract.hasVoted(account);
        setUserVoteStatus({ registered: isReg, voted: hasV });
      }

      // Compute results when ended
      if (state === 2) {
        if (Number(total) === 0) {
          setResults({ status: 'no-votes', winners: [], maxVotes: 0 });
        } else {
          let max = 0;
          for (const p of partiesData) max = Math.max(max, Number(p.voteCount));
          const winners = partiesData.filter(p => Number(p.voteCount) === max);
          if (winners.length === 1) {
            setResults({ status: 'winner', winners, maxVotes: max });
          } else {
            setResults({ status: 'tie', winners, maxVotes: max });
          }
        }
      } else {
        setResults({ status: 'pending', winners: [], maxVotes: 0 });
        setShowConfetti(false);
        confettiPlayedRef.current = false;
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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

  const colorMap = (name) => {
    switch (name) {
      case 'Democrats':
        return { bg: '#3B82F6', border: '#2563EB' };
      case 'Republicans':
        return { bg: '#EF4444', border: '#DC2626' };
      case 'American Party':
        return { bg: '#10B981', border: '#059669' };
      default:
        return { bg: '#9CA3AF', border: '#6B7280' };
    }
  };

  const chartLabels = parties.map(party => `${party.name} (${party.candidateName})`);
  const chartValues = parties.map(party => party.voteCount);
  const doughnutBg = parties.map(party => colorMap(party.name).bg);
  const doughnutBorder = parties.map(party => colorMap(party.name).border);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: chartValues,
        backgroundColor: doughnutBg,
        borderWidth: 2,
        borderColor: doughnutBorder,
      },
    ],
  };

  const barData = {
    labels: parties.map(party => party.name),
    datasets: [
      {
        label: 'Votes',
        data: parties.map(party => party.voteCount),
        backgroundColor: parties.map(party => colorMap(party.name).bg),
        borderColor: parties.map(party => colorMap(party.name).border),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#ffffff',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
      },
    },
  };

  // Trigger confetti when voting just ended and we have a single winner
  useEffect(() => {
    if (votingState === 2 && results.status === 'winner' && endedEventRef.current && !confettiPlayedRef.current) {
      setShowConfetti(true);
      confettiPlayedRef.current = true;
      const winner = results.winners[0];
      if (winner) {
        toast.success(`Winner: ${winner.name} - ${winner.candidateName} with ${results.maxVotes} votes`, { toastId: 'winner-announced' });
      }
    }
  }, [votingState, results]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfettiBurst run={showConfetti} durationMs={4500} onDone={() => setShowConfetti(false)} />
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          USA 2028 Presidential Election
        </h1>
        <p className="text-white/80 text-lg">
          Secure voting powered by FHEVM - Your vote is encrypted and private
        </p>
      </div>

      {/* Status Cards */}
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
            {registeredVoters}
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

      {/* Results Announcement */}
      {votingState === 2 && (
        <div className="glass-effect rounded-xl p-6">
          {results.status === 'no-votes' && (
            <div className="text-center">
              <div className="text-5xl mb-3">🗳️</div>
              <h3 className="text-2xl font-semibold text-white mb-2">Election Ended</h3>
              <p className="text-white/80">No votes were cast.</p>
            </div>
          )}
          {results.status === 'tie' && (
            <div className="text-center">
              <div className="text-5xl mb-3">🤝</div>
              <h3 className="text-2xl font-semibold text-white mb-2">It's a tie!</h3>
              <p className="text-white/80">
                {results.winners.map(w => `${w.name} (${w.candidateName})`).join(' • ')} with {results.maxVotes} votes each
              </p>
            </div>
          )}
          {results.status === 'winner' && results.winners[0] && (
            <div className="text-center">
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="text-2xl font-semibold text-white mb-2">Congratulations!</h3>
              <p className="text-white/90 text-lg">
                {results.winners[0].name} - {results.winners[0].candidateName} won with <span className="text-blue-300 font-bold">{results.maxVotes}</span> votes
              </p>
            </div>
          )}
        </div>
      )}

      {/* User Status */}
      {account && (
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Your Voting Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${userVoteStatus.registered ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-white">
                {userVoteStatus.registered ? 'Registered to Vote' : 'Not Registered'}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${userVoteStatus.voted ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-white">
                {userVoteStatus.voted ? 'Vote Cast' : 'Vote Not Cast'}
              </span>
            </div>
          </div>
          
          {userVoteStatus.registered && !userVoteStatus.voted && votingState === 1 && (
            <div className="mt-4">
              <Link
                to="/vote"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Cast Your Vote Now
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Vote Distribution</h3>
          <div className="h-64">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Vote Comparison</h3>
          <div className="h-64">
            <Bar 
              data={barData} 
              options={{
                ...chartOptions,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      color: '#ffffff',
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                    },
                  },
                  x: {
                    ticks: {
                      color: '#ffffff',
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                    },
                  },
                },
              }} 
            />
          </div>
        </div>
      </div>

      {/* Party Information */}
      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Political Parties & Candidates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {parties.map((party, index) => (
            <div key={party.id} className="vote-card bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="text-lg font-semibold text-white mb-2">{party.name}</div>
              <div className="text-sm text-white/70 mb-3">Candidate: {party.candidateName}</div>
              <div className="text-2xl font-bold text-blue-300">{party.voteCount} votes</div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="glass-effect rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Admin Actions</h3>
          <div className="flex flex-wrap gap-4">
            {votingState === 0 && (
              <button
                onClick={async () => {
                  try {
                    await contract.startVoting(60); // 60 minutes
                    toast.success('Voting started successfully!', { toastId: 'voting-started' });
                  } catch (error) {
                    toast.error('Failed to start voting', { toastId: 'start-failed' });
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Start Voting (1 hour)
              </button>
            )}
            
            {votingState === 1 && (
              <button
                onClick={async () => {
                  try {
                    await contract.endVoting();
                    toast.success('Voting ended successfully!', { toastId: 'voting-ended' });
                  } catch (error) {
                    toast.error('Failed to end voting', { toastId: 'end-failed' });
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                End Voting
              </button>
            )}
            
            <Link
              to="/admin"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Admin Panel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
