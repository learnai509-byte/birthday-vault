'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CryptoJS from 'crypto-js';

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if URL has key parameter
  useEffect(() => {
    const keyFromUrl = searchParams.get('key');
    if (keyFromUrl) {
      setSecretKey(keyFromUrl);
      setSuccess('✅ Key auto-filled from link!');
      setTimeout(() => setSuccess(''), 3000);
    }
  }, [searchParams]);

  const handleAccessExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!secretKey.trim()) {
      setError('❌ Please enter or scan the secret key');
      return;
    }

    setLoading(true);

    try {
      const enteredKeyHash = CryptoJS.SHA256(secretKey).toString();
      const { getVaultData } = await import('@/lib/supabase-client');
      const result = await getVaultData(enteredKeyHash);

      if (!result.success || !result.data) {
        setLoading(false);
        setError('❌ Invalid secret key. Please try again or ask the creator.');
        return;
      }

      localStorage.setItem('sessionKey', secretKey);
      localStorage.setItem('sessionTime', Date.now().toString());

      setSuccess('✅ Access granted!');
      setTimeout(() => {
        router.push('/experience');
      }, 500);
    } catch (error: any) {
      console.error('Validation error:', error);
      setLoading(false);
      setError('❌ Error validating key. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-light">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm font-light">
            {success}
          </div>
        )}

        <div className="backdrop-blur-md bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-light text-purple-900 mb-2">
              💝 Birthday Vault
            </h1>
            <p className="text-pink-600 font-light text-sm md:text-base">
              Enter the secret key to access your surprise
            </p>
          </div>

          <form onSubmit={handleAccessExperience} className="space-y-6">
            <div>
              <label className="block text-sm font-light text-gray-700 mb-2">
                Secret Key
              </label>
              <input
                type="text"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
                placeholder="Enter 10-character key..."
                maxLength={10}
                className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light text-center text-lg tracking-widest"
              />
              <p className="text-xs text-gray-600 mt-2 font-light text-center">
                Ask the creator for the secret key
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-lg hover:shadow-lg transition-all font-light disabled:opacity-50 active:scale-95"
            >
              {loading ? '⏳ Verifying...' : 'Open Experience 💌'}
            </button>
          </form>

          <div className="my-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white/40 text-gray-700 font-light">
                OR
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-600 font-light text-center mb-4">
              Are you the creator? Set up your surprise!
            </p>
            <button
              onClick={() => {
                const password = prompt('Enter admin password:');
                if (password === 'admin123') {
                  router.push('/admin');
                } else if (password !== null) {
                  setError('❌ Wrong password');
                }
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-300 to-blue-400 text-white rounded-lg hover:shadow-lg transition-all font-light active:scale-95"
            >
              🔐 Creator Setup
            </button>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-600 font-light text-xs">
          <p>🔒 Your experience is private and secure</p>
          <p className="mt-2">Made with 💕 for special moments</p>
        </div>
      </div>
    </div>
  );
}