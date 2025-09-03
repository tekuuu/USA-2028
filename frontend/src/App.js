import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Voting from './components/Voting';
import Admin from './components/Admin';
import { VotingContract } from './contracts/VotingContract';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastAccountRef = useRef(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing app...');
      
      // Check if MetaMask is installed
      if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask detected');
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        // Get connected accounts
        const accounts = await provider.listAccounts();
        console.log('Connected accounts:', accounts);
        
        if (accounts.length > 0) {
          await connectWallet(accounts[0], true);
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', async (accounts) => {
          console.log('Account changed:', accounts);
          if (accounts.length > 0) {
            const next = accounts[0];
            const last = lastAccountRef.current;
            if (last && last.toLowerCase() === next.toLowerCase()) {
              return;
            }
            await connectWallet(next);
          } else {
            setAccount(null);
            setContract(null);
            setIsAdmin(false);
            lastAccountRef.current = null;
            toast.info('Wallet disconnected', { toastId: 'wallet-disconnected' });
          }
        });
      } else {
        console.log('MetaMask not detected');
        toast.error('Please install MetaMask to use this dApp', { toastId: 'metamask-required' });
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      toast.error('Failed to initialize the application', { toastId: 'init-failed' });
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async (accountAddress, silent = false) => {
    try {
      console.log('Connecting wallet:', accountAddress);
      setAccount(accountAddress);

      const ensureProvider = provider || new ethers.BrowserProvider(window.ethereum);
      if (!provider) {
        console.log('Initialized new provider');
        setProvider(ensureProvider);
      }

      const signer = await ensureProvider.getSigner();
      console.log('Got signer');

      const votingContract = new VotingContract(signer);
      console.log('Created voting contract instance');
      setContract(votingContract);

      try {
        const owner = await votingContract.getOwner();
        console.log('Contract owner:', owner);
        const isAdminUser = owner.toLowerCase() === accountAddress.toLowerCase();
        console.log('Is admin:', isAdminUser);
        setIsAdmin(isAdminUser);
      } catch (adminErr) {
        console.warn('Could not determine admin status. Defaulting to non-admin.', adminErr);
        setIsAdmin(false);
      }

      if (!silent && !(lastAccountRef.current && lastAccountRef.current.toLowerCase() === accountAddress.toLowerCase())) {
        toast.success('Wallet connected successfully!', { toastId: 'wallet-connected' });
      }
      lastAccountRef.current = accountAddress;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      // Only show error if nothing is connected
      if (!account) {
        toast.error('Failed to connect wallet', { toastId: 'connect-failed' });
      }
    }
  };

  const connectMetaMask = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        console.log('Requesting accounts from MetaMask...');
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        console.log('Accounts received:', accounts);
        
        if (accounts.length > 0) {
          await connectWallet(accounts[0]);
        } else {
          toast.error('No accounts found', { toastId: 'no-accounts' });
        }
      } else {
        toast.error('Please install MetaMask', { toastId: 'metamask-required' });
      }
    } catch (error) {
      console.error('Error connecting MetaMask:', error);
      toast.error('Failed to connect MetaMask', { toastId: 'connect-failed' });
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setIsAdmin(false);
    lastAccountRef.current = null;
    toast.info('Wallet disconnected', { toastId: 'wallet-disconnected' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">Loading USA 2028 Voting dApp...</div>
          <div className="text-white/70 text-lg">Please ensure MetaMask is installed and connected</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        account={account} 
        isAdmin={isAdmin}
        onConnect={connectMetaMask}
        onDisconnect={disconnectWallet}
      />
      
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                contract={contract}
                account={account}
                isAdmin={isAdmin}
              />
            } 
          />
          <Route 
            path="/vote" 
            element={
              <Voting 
                contract={contract}
                account={account}
              />
            } 
          />
          <Route 
            path="/admin" 
            element={
              <Admin 
                contract={contract}
                account={account}
                isAdmin={isAdmin}
              />
            } 
          />
        </Routes>
      </main>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={1}
      />
    </div>
  );
}

export default App;
