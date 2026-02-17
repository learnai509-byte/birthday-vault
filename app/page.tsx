'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CryptoJS from 'crypto-js';

export default function HomePage() {
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Read secret key from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const keyFromUrl = params.get('key');
    
    if (keyFromUrl) {
      setSecretKey(keyFromUrl.toUpperCase());
      setSuccess('✅ Secret key loaded from link!');
      setTimeout(() => setSuccess(''), 3000);
    }
  }, []);

  const handleAccessExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!secretKey.trim()) {
      setError('❌ Please enter or scan the secret key');
      return;
    }

    setLoading(true);

    try {
      // Get admin data from IndexedDB
      const { getData } = await import('@/lib/indexeddb');
      const adminData = await getData();

      if (!adminData) {
        setError('❌ Birthday vault not found. Ask the person to set it up first.');
        setLoading(false);
        return;
      }

      // Hash the entered key
      const enteredKeyHash = CryptoJS.SHA256(secretKey).toString();

      // Compare with stored hash
      if (enteredKeyHash !== adminData.secretKeyHash) {
        setError('❌ Invalid secret key. Please try again.');
        setLoading(false);
        return;
      }

      // Valid key - create session
      localStorage.setItem('sessionKey', secretKey);
      localStorage.setItem('sessionTime', Date.now().toString());

      setSuccess('✅ Access granted! Welcome! 💝');
      setTimeout(() => {
        router.push('/experience');
      }, 500);
    } catch (err) {
      console.error('Error:', err);
      setError('❌ Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleCreatorSetup = () => {
    const password = prompt('Enter admin password:');
    if (password === 'admin123') {
      router.push('/admin');
    } else if (password !== null) {
      alert('❌ Wrong password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-md bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💝</div>
            <h1 className="text-4xl font-light text-purple-900 mb-2">
              Birthday Vault
            </h1>
            <p className="text-pink-600 font-light text-sm">
              A gift of memories for someone special
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-light">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm font-light">
              {success}
            </div>
          )}

          <form onSubmit={handleAccessExperience} className="space-y-6">
            <div>
              <label className="block text-sm font-light text-gray-700 mb-3">
                Enter Secret Key
              </label>
              <input
                type="text"
                placeholder="Paste your secret key here..."
                value={secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value.toUpperCase());
                  setError('');
                }}
                className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light text-center text-lg tracking-widest"
              />
              <p className="text-xs text-gray-600 mt-2 font-light text-center">
                Format: XXXXXXXXXX (10 characters)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-lg hover:shadow-lg transition-all font-light active:scale-95 disabled:opacity-50"
            >
              {loading ? '⏳ Verifying...' : 'Open Experience 💌'}
            </button>
          </form>

          {/* CREATOR SETUP SECTION */}
          <div className="mt-8 pt-8 border-t border-white/20">
            <p className="text-xs text-gray-600 font-light text-center mb-4">
              Are you the creator? Set up your surprise!
            </p>
            <button
              onClick={handleCreatorSetup}
              className="w-full py-3 bg-gradient-to-r from-purple-300 to-purple-400 text-white rounded-lg hover:shadow-lg transition-all font-light active:scale-95"
            >
              🔐 Creator Setup
            </button>
          </div>

          <div className="mt-6 text-center text-gray-600 font-light text-sm">
            <p>✨ A personal experience just for you</p>
          </div>
        </div>
      </div>
    </div>
  );
}