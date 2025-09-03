// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@fhevm/solidity/lib/FHE.sol";

contract USA2028Voting is Ownable, ReentrancyGuard {

    // Voting states
    enum VotingState { NOT_STARTED, ACTIVE, ENDED }
    
    // Party structure
    struct Party {
        string name;
        string candidateName;
        bool exists;
    }
    
    // Voter structure
    struct Voter {
        bool hasVoted;
        bool isRegistered;
    }
    
    // State variables
    VotingState public votingState;
    uint256 public votingStartTime;
    uint256 public votingEndTime;
    euint32 private totalVotes;

    // Encrypted vote counts per party
    mapping(uint256 => euint32) private voteCounts;

    // Published plaintext results (revealed only after voting ends)
    bool public resultsPublished;
    mapping(uint256 => uint256) private publishedVoteCounts;
    uint256 private publishedTotalVotes;
    
    // Party mapping
    mapping(uint256 => Party) public parties;
    uint256 public partyCount;
    
    // Voter mapping
    mapping(address => Voter) public voters;
    address[] public registeredVoters;
    
    // Events
    event VotingStarted(uint256 startTime, uint256 duration);
    event VotingEnded(uint256 endTime);
    event VoterRegistered(address voter);
    event VoteCast(address voter, uint256 partyId); // event remains plaintext; counts are encrypted
    event PartyAdded(uint256 partyId, string name, string candidate);
    event ResultsPublished();
    
    // Modifiers
    modifier onlyVotingActive() {
        require(votingState == VotingState.ACTIVE, "Voting is not active");
        _;
    }
    
    modifier onlyVotingNotStarted() {
        require(votingState == VotingState.NOT_STARTED, "Voting has already started");
        _;
    }
    
    modifier onlyVotingEnded() {
        require(votingState == VotingState.ENDED, "Voting has not ended");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        votingState = VotingState.NOT_STARTED;
        partyCount = 0;
        totalVotes = FHE.asEuint32(0);
    }
    
    // Admin functions
    function startVoting(uint256 durationInMinutes) external onlyOwner onlyVotingNotStarted {
        votingStartTime = block.timestamp;
        votingEndTime = block.timestamp + (durationInMinutes * 1 minutes);
        votingState = VotingState.ACTIVE;
        
        emit VotingStarted(votingStartTime, durationInMinutes);
    }
    
    function endVoting() external onlyOwner onlyVotingActive {
        votingState = VotingState.ENDED;
        votingEndTime = block.timestamp;
        
        emit VotingEnded(votingEndTime);
    }
    
    function addParty(string memory name, string memory candidate) external onlyOwner {
        _addParty(name, candidate);
    }
    
    function registerVoter(address voter) external onlyOwner {
        require(!voters[voter].isRegistered, "Voter already registered");
        
        voters[voter].isRegistered = true;
        registeredVoters.push(voter);
        
        emit VoterRegistered(voter);
    }
    
    function registerMultipleVoters(address[] memory voterAddresses) external onlyOwner {
        for (uint256 i = 0; i < voterAddresses.length; i++) {
            if (!voters[voterAddresses[i]].isRegistered) {
                voters[voterAddresses[i]].isRegistered = true;
                registeredVoters.push(voterAddresses[i]);
                emit VoterRegistered(voterAddresses[i]);
            }
        }
    }
    
    // Voting function - encrypted vote increment by 1 provided by the client
    function castVote(uint256 partyId) external onlyVotingActive nonReentrant {
        require(voters[msg.sender].isRegistered, "Voter not registered");
        require(!voters[msg.sender].hasVoted, "Already voted");
        require(partyId < partyCount, "Invalid party ID");
        require(parties[partyId].exists, "Party does not exist");
        
        // Add to encrypted vote count using encrypted constant 1
        euint32 one = FHE.asEuint32(1);
        voteCounts[partyId] = FHE.add(voteCounts[partyId], one);

        // Mark as voted and increment total (encrypted)
        voters[msg.sender].hasVoted = true;
        totalVotes = FHE.add(totalVotes, one);
        
        emit VoteCast(msg.sender, partyId);
    }
    
    // View functions
    function getVotingState() external view returns (VotingState) {
        return votingState;
    }
    
    function getParty(uint256 partyId) external view returns (string memory name, string memory candidate, bool exists) {
        Party memory party = parties[partyId];
        return (party.name, party.candidateName, party.exists);
    }
    
    function getPartyCount() external view returns (uint256) {
        return partyCount;
    }
    
    function isVoterRegistered(address voter) external view returns (bool) {
        return voters[voter].isRegistered;
    }
    
    function hasVoted(address voter) external view returns (bool) {
        return voters[voter].hasVoted;
    }
    
    // Return ciphertext handle for total votes (client must use FHEVM gateway to decrypt)
    function getTotalVotesCiphertext() external view returns (euint32) {
        return totalVotes;
    }
    
    function getRegisteredVotersCount() external view returns (uint256) {
        return registeredVoters.length;
    }

    
    // Return ciphertext handle for a party's votes
    function getVoteCountCiphertext(uint256 partyId) external view returns (euint32) {
        require(partyId < partyCount, "Invalid party ID");
        return voteCounts[partyId];
    }

    // Plaintext getter: returns published results after reveal, or 0 before reveal
    function getVoteCount(uint256 partyId) external view returns (uint256) {
        require(partyId < partyCount, "Invalid party ID");
        if (!resultsPublished) return 0;
        return publishedVoteCounts[partyId];
    }

    // Plaintext getter: returns published aggregate after reveal, or 0 before reveal
    function getTotalVotes() external view returns (uint256) {
        if (!resultsPublished) return 0;
        return publishedTotalVotes;
    }

    // Reveal and publish aggregated results using FHE decryption (no individual ballots are exposed)
    function publishResults() external onlyOwner onlyVotingEnded {
        require(!resultsPublished, "Results already published");
        uint32 total = FHE.decrypt(totalVotes);
        for (uint256 i = 0; i < partyCount; i++) {
            uint32 v = FHE.decrypt(voteCounts[i]);
            publishedVoteCounts[i] = uint256(v);
        }
        publishedTotalVotes = uint256(total);
        resultsPublished = true;
        emit ResultsPublished();
    }

    // Internal functions
    function _addParty(string memory name, string memory candidate) internal {
        parties[partyCount] = Party({
            name: name,
            candidateName: candidate,
            exists: true
        });
        // initialize encrypted counter for this party to 0
        voteCounts[partyCount] = FHE.asEuint32(0);

        emit PartyAdded(partyCount, name, candidate);
        partyCount++;
    }
}
