'use client';

import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { saveData, getData, getStorageSize } from '@/lib/indexeddb';

export default function AdminPanel() {
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [birthdayDate, setBirthdayDate] = useState('2025-02-20');
  const [secretKey, setSecretKey] = useState('');
  const [finalLetter, setFinalLetter] = useState('');
  const [memories, setMemories] = useState<Array<{
    id: string;
    number: number;
    message: string;
    expandedMessage: string;
    photoUrl: string;
    videoUrl: string;
  }>>([]);
  const [newMemory, setNewMemory] = useState({ 
    number: 1, 
    message: '',
    expandedMessage: '',
    photoFile: null as File | null,
    videoFile: null as File | null
  });
  const [audioFiles, setAudioFiles] = useState({
    backgroundMusic: null as File | null,
    heartbeat: null as File | null,
    backgroundMusicUrl: '' as string,
    heartbeatUrl: '' as string
  });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storageInfo, setStorageInfo] = useState({ used: 0, limit: 50 });
  const [shareUrl, setShareUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const ADMIN_PASSWORD = 'admin123';
  const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 30 * 1024 * 1024;
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

  // Get base URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.origin;
      setBaseUrl(url);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSavedData();
    }
  }, [isAuthenticated]);

  const loadSavedData = async () => {
    try {
      const data = await getData();
      if (data) {
        if (data.memories) {
          setMemories(data.memories);
        }
        if (data.birthdayDate) {
          setBirthdayDate(data.birthdayDate);
        }
        if (data.secretKeyHash) {
          setSecretKey('***SAVED***');
        }
        if (data.finalLetter) {
          setFinalLetter(data.finalLetter);
        }
        if (data.audio) {
          setAudioFiles(prev => ({
            ...prev,
            backgroundMusicUrl: data.audio.backgroundMusic || '',
            heartbeatUrl: data.audio.heartbeat || ''
          }));
        }
      }
      updateStorageInfo();
    } catch (e) {
      console.error('Failed to load saved data:', e);
    }
  };

  const updateStorageInfo = async () => {
    try {
      const used = await getStorageSize();
      setStorageInfo({ used: Math.round(used / 1024 / 1024), limit: 50 });
    } catch (e) {
      console.error('Failed to get storage info:', e);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setSuccess('Login successful! 🎉');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('❌ Wrong password. Please try again.');
    }
  };

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecretKey(result);
    setError('');
    setSuccess('✅ Secret key generated!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_SIZE) {
      setError(`❌ Photo too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 5MB.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('❌ Please upload an image file');
      return;
    }
    setNewMemory({ ...newMemory, photoFile: file });
    setError('');
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE) {
      setError(`❌ Video too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 30MB.`);
      return;
    }
    if (!file.type.startsWith('video/')) {
      setError('❌ Please upload a video file');
      return;
    }
    setNewMemory({ ...newMemory, videoFile: file });
    setError('');
  };

  const handleAudioSelect = (type: 'backgroundMusic' | 'heartbeat') => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_AUDIO_SIZE) {
        setError(`❌ Audio too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 10MB.`);
        return;
      }
      if (!file.type.startsWith('audio/')) {
        setError('❌ Please upload an audio file');
        return;
      }
      setAudioFiles({ ...audioFiles, [type]: file });
      setError('');
    };
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      try {
        reader.readAsDataURL(file);
      } catch (err) {
        reject(new Error('Invalid file format'));
      }
    });
  };

  // ✅ CORRECTED: saveBirthdayAndKey with proper Supabase integration
  const saveBirthdayAndKey = async () => {
    setError('');
    setSuccess('');

    if (!secretKey || !birthdayDate) {
      setError('❌ Please set both birthday date and secret key');
      return;
    }

    if (secretKey === '***SAVED***') {
      setError('❌ Please generate a new secret key first');
      return;
    }

    setUploading(true);
    setUploadStatus('Validating data...');

    try {
      let backgroundMusicUrl = audioFiles.backgroundMusicUrl;
      let heartbeatUrl = audioFiles.heartbeatUrl;

      if (audioFiles.backgroundMusic) {
        setUploadStatus('Processing background music... 🎵');
        await new Promise(resolve => setTimeout(resolve, 100));
        backgroundMusicUrl = await convertToBase64(audioFiles.backgroundMusic);
      }

      if (audioFiles.heartbeat) {
        setUploadStatus('Processing heartbeat sound... 💓');
        await new Promise(resolve => setTimeout(resolve, 100));
        heartbeatUrl = await convertToBase64(audioFiles.heartbeat);
      }

      // ✅ USE SAME HASHING AS EXPERIENCE PAGE (CryptoJS.SHA256)
      const keyHash = CryptoJS.SHA256(secretKey).toString();

      setUploadStatus('Saving to cloud...');
      await new Promise(resolve => setTimeout(resolve, 100));

      // ✅ USE SUPABASE TO SAVE
      const { saveVaultData } = await import('@/lib/supabase-client');
      
      const result = await saveVaultData(keyHash, {
        birthdayDate,
        memories,
        finalLetter,
        audio: {
          backgroundMusic: backgroundMusicUrl,
          heartbeat: heartbeatUrl,
        }
      });

      if (!result.success) {
        throw result.error;
      }

      // ✅ ALSO SAVE TO INDEXEDDB AS BACKUP
      const adminData = {
        birthdayDate,
        secretKeyHash: keyHash,
        createdAt: new Date().toISOString(),
        memories: memories,
        finalLetter: finalLetter,
        audio: {
          backgroundMusic: backgroundMusicUrl,
          heartbeat: heartbeatUrl,
        }
      };

      await saveData(adminData);

      setUploadStatus('');
      setUploading(false);
      
      await updateStorageInfo();
      
      const shareLink = `${baseUrl}?key=${secretKey}`;
      setShareUrl(shareLink);
      
      setSuccess(`✅ Saved! Using ${storageInfo.used}MB of 50MB`);
      setSecretKey('***SAVED***');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Save error:', error);
      setUploading(false);
      setUploadStatus('');
      setError(`❌ Error: ${error.message || 'Failed to save'}`);
    }
  };

  const addMemory = async () => {
    setError('');
    setSuccess('');

    if (!newMemory.message.trim()) {
      setError('❌ Please enter a message');
      return;
    }

    if (!newMemory.photoFile && !newMemory.videoFile) {
      setError('❌ Please add at least a photo or video');
      return;
    }

    setUploading(true);
    setUploadStatus('Adding memory...');

    try {
      let photoUrl = '';
      let videoUrl = '';

      if (newMemory.photoFile) {
        setUploadStatus(`Processing photo... 📸`);
        await new Promise(resolve => setTimeout(resolve, 100));
        photoUrl = await convertToBase64(newMemory.photoFile);
      }

      if (newMemory.videoFile) {
        setUploadStatus(`Processing video... 🎬`);
        await new Promise(resolve => setTimeout(resolve, 100));
        videoUrl = await convertToBase64(newMemory.videoFile);
      }

      const memory = {
        id: Date.now().toString(),
        number: newMemory.number,
        message: newMemory.message,
        expandedMessage: newMemory.expandedMessage,
        photoUrl: photoUrl,
        videoUrl: videoUrl,
      };

      const updatedMemories = [...memories, memory];
      setMemories(updatedMemories);
      
      setNewMemory({ 
        number: updatedMemories.length + 1, 
        message: '', 
        expandedMessage: '', 
        photoFile: null,
        videoFile: null 
      });

      setUploadStatus('');
      setUploading(false);
      
      await updateStorageInfo();
      
      setSuccess(`✅ Memory added!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Add memory error:', error);
      setUploading(false);
      setUploadStatus('');
      setError(`❌ Failed: ${error.message}`);
    }
  };

  const deleteMemory = (id: string) => {
    setMemories(memories.filter(m => m.id !== id));
    setSuccess('✅ Memory deleted');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md backdrop-blur-md bg-white/40 rounded-2xl p-8 shadow-2xl border border-white/20">
          <h1 className="text-3xl font-light text-purple-900 text-center mb-2">
            🔐 Admin Panel
          </h1>
          <p className="text-pink-600 font-light text-sm text-center mb-8">
            Set up your birthday surprise
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-light">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <input
              type="password"
              placeholder="Admin password..."
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light"
            />

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-lg hover:shadow-lg transition-all font-light active:scale-95"
            >
              Enter Admin Panel ✨
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6 font-light">
            Default password: admin123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-blue-50 p-4 md:p-8">
      {/* Loading Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <div className="mb-4">
              <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto"></div>
            </div>
            <p className="text-gray-700 font-light mb-2">{uploadStatus}</p>
            <p className="text-xs text-gray-500">Please wait...</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="fixed top-4 left-4 right-4 max-w-md mx-auto p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-light z-40">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 left-4 right-4 max-w-md mx-auto p-4 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm font-light z-40">
          {success}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light text-purple-900 mb-2">
            💝 Birthday Gift Setup
          </h1>
          <p className="text-pink-600 font-light text-sm md:text-base">
            Configure your private love universe
          </p>
          <div className="mt-4 inline-block bg-blue-100 rounded-lg px-4 py-2">
            <p className="text-sm font-light text-blue-700">
              💾 Storage: {storageInfo.used}MB / {storageInfo.limit}MB
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Birthday & Secret Key Section */}
          <div className="backdrop-blur-md bg-white/40 rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-light text-purple-900 mb-6">
              🎂 Birthday & Secret Key
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Birthday Date
                </label>
                <input
                  type="date"
                  value={birthdayDate}
                  onChange={(e) => setBirthdayDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light"
                />
              </div>

              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Secret Key
                </label>
                <div className="flex gap-2 flex-col md:flex-row">
                  <input
                    type="text"
                    value={secretKey}
                    readOnly
                    placeholder="Click Generate..."
                    className="flex-1 px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none font-light text-sm md:text-base"
                  />
                  <button
                    onClick={generateSecretKey}
                    className="px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all font-light active:scale-95 whitespace-nowrap"
                  >
                    Generate 🔑
                  </button>
                </div>
                {secretKey && secretKey !== '***SAVED***' && (
                  <p className="text-xs text-gray-600 mt-2 font-light break-all">
                    📝 Key: <strong>{secretKey}</strong>
                  </p>
                )}
                {secretKey === '***SAVED***' && (
                  <p className="text-xs text-green-600 mt-2 font-light">
                    ✅ Key saved
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  🎹 Background Music (Max 10MB)
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioSelect('backgroundMusic')}
                  disabled={uploading}
                  className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light disabled:opacity-50 text-sm"
                />
                {audioFiles.backgroundMusic && (
                  <p className="text-xs text-gray-600 mt-1 font-light">
                    ✅ {audioFiles.backgroundMusic.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  💓 Heartbeat Sound (Max 10MB)
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioSelect('heartbeat')}
                  disabled={uploading}
                  className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light disabled:opacity-50 text-sm"
                />
                {audioFiles.heartbeat && (
                  <p className="text-xs text-gray-600 mt-1 font-light">
                    ✅ {audioFiles.heartbeat.name}
                  </p>
                )}
              </div>

              <button
                onClick={saveBirthdayAndKey}
                disabled={uploading}
                className="w-full py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-lg hover:shadow-lg transition-all font-light disabled:opacity-50 active:scale-95"
              >
                {uploading ? '⏳ Saving...' : 'Save Birthday & Key 💾'}
              </button>
            </div>
          </div>

          {/* Memories Section */}
          <div className="backdrop-blur-md bg-white/40 rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-light text-purple-900 mb-6">
              📸 Memories & Messages
            </h2>

            <div className="mb-8 p-6 bg-white/30 rounded-xl border border-pink-200">
              <h3 className="text-lg font-light text-purple-900 mb-4">
                Add New Memory
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    Memory Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMemory.number}
                    onChange={(e) => setNewMemory({ ...newMemory, number: parseInt(e.target.value) || 1 })}
                    disabled={uploading}
                    className="w-full px-4 py-2 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    Love Message
                  </label>
                  <textarea
                    value={newMemory.message}
                    onChange={(e) => setNewMemory({ ...newMemory, message: e.target.value })}
                    placeholder="Write your message here..."
                    rows={4}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light resize-none disabled:opacity-50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    💌 Expanded Message (Optional)
                  </label>
                  <textarea
                    value={newMemory.expandedMessage}
                    onChange={(e) => setNewMemory({ ...newMemory, expandedMessage: e.target.value })}
                    placeholder="Optional: Click to read more..."
                    rows={3}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light resize-none text-sm disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    📸 Photo (Max 5MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light disabled:opacity-50 text-sm"
                  />
                  {newMemory.photoFile && (
                    <div className="mt-3">
                      <img
                        src={URL.createObjectURL(newMemory.photoFile)}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <p className="text-xs text-gray-600 mt-1 font-light truncate">
                        ✅ {newMemory.photoFile.name}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    🎬 Video (Max 30MB)
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light disabled:opacity-50 text-sm"
                  />
                  {newMemory.videoFile && (
                    <p className="text-xs text-gray-600 mt-1 font-light truncate">
                      ✅ {newMemory.videoFile.name}
                    </p>
                  )}
                </div>

                <button
                  onClick={addMemory}
                  disabled={uploading}
                  className="w-full py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg hover:shadow-lg transition-all font-light disabled:opacity-50 active:scale-95"
                >
                  {uploading ? '⏳ Processing...' : 'Add Memory ✨'}
                </button>
              </div>
            </div>

            {memories.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-light text-purple-900">
                  Your Memories ({memories.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="p-4 bg-white/30 rounded-lg border border-pink-200"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-sm font-light text-gray-600">
                          Memory #{memory.number}
                        </p>
                        <button
                          onClick={() => deleteMemory(memory.id)}
                          disabled={uploading}
                          className="text-red-500 hover:text-red-700 text-sm font-light disabled:opacity-50"
                        >
                          Delete ❌
                        </button>
                      </div>

                      {memory.photoUrl && (
                        <div className="mb-3 rounded-lg overflow-hidden max-w-xs">
                          <img
                            src={memory.photoUrl}
                            alt={`Memory ${memory.number}`}
                            className="w-full h-32 object-cover rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {memory.videoUrl && (
                        <div className="mb-3 text-xs text-green-600 font-light">
                          ✅ Video attached
                        </div>
                      )}

                      <p className="text-gray-800 font-light text-sm">{memory.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Share Section */}
          <div className="backdrop-blur-md bg-white/40 rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-light text-purple-900 mb-6">
              🔗 Share Experience
            </h2>

            {shareUrl ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-light text-gray-700 mb-2">
                    📋 Shareable Link
                  </label>
                  <div className="flex gap-2 flex-col md:flex-row">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-4 py-3 bg-white/50 border border-pink-200 rounded-lg font-light text-xs md:text-sm break-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        setSuccess('✅ Copied!');
                        setTimeout(() => setSuccess(''), 2000);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all font-light active:scale-95 whitespace-nowrap text-sm"
                    >
                      Copy 📋
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => {
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareUrl)}`;
                      window.open(qrUrl, '_blank');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all font-light active:scale-95"
                  >
                    Generate QR Code 📱
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm font-light text-gray-600">
                Save birthday & key first to see share options
              </p>
            )}
          </div>

          {/* Final Letter Section */}
          <div className="backdrop-blur-md bg-white/40 rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-light text-purple-900 mb-6">
              💌 Final Letter
            </h2>

            <div className="space-y-4">
              <textarea
                value={finalLetter}
                onChange={(e) => setFinalLetter(e.target.value)}
                placeholder="Write your love letter here..."
                rows={6}
                disabled={uploading}
                className="w-full px-4 py-3 bg-white/50 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 font-light resize-none disabled:opacity-50 text-sm"
              />
              <p className="text-xs text-gray-500 font-light">
                Leave empty for default letter
              </p>
            </div>
          </div>

          {/* Info Section */}
          <div className="backdrop-blur-md bg-white/40 rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-light text-purple-900 mb-4">
              ℹ️ Setup Guide
            </h2>
            <ul className="space-y-2 text-gray-700 font-light text-sm">
              <li>1️⃣ Set birthday date</li>
              <li>2️⃣ Generate secret key</li>
              <li>3️⃣ Add audio (optional)</li>
              <li>4️⃣ Add memories</li>
              <li>5️⃣ Write final letter</li>
              <li>6️⃣ Click "Save Birthday & Key"</li>
              <li>7️⃣ Share link via Copy or QR Code</li>
            </ul>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            disabled={uploading}
            className="w-full py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-all font-light disabled:opacity-50 active:scale-95"
          >
            Logout 👋
          </button>
        </div>
      </div>
    </div>
  );
}
