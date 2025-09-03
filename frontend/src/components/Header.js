import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ account, isAdmin, onConnect, onDisconnect }) => {
  const location = useLocation();

  const shortenAddress = (address) => {
    if (!address || typeof address !== 'string') return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="glass-effect border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">US</span>
            </div>
            <span className="text-white font-bold text-xl">USA 2028</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'text-blue-300 border-b-2 border-blue-300' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            {!isAdmin && (
              <Link
                to="/vote"
                className={`text-sm font-medium transition-colors ${
                  isActive('/vote')
                    ? 'text-blue-300 border-b-2 border-blue-300'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Vote
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors ${
                  isActive('/admin') 
                    ? 'text-blue-300 border-b-2 border-blue-300' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-3">
                <div className="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
                  <span className="text-green-300 text-sm font-medium">
                    Connected
                  </span>
                </div>
                <div className="bg-white/10 rounded-full px-3 py-1">
                  <span className="text-white text-sm font-mono">
                    {shortenAddress(account)}
                  </span>
                </div>
                {isAdmin && (
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-full px-3 py-1">
                    <span className="text-purple-300 text-sm font-medium">
                      Admin
                    </span>
                  </div>
                )}
                <button
                  onClick={onDisconnect}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
