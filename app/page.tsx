import { Suspense } from 'react';
import HomeContent from './home-content';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
        <p className="text-gray-700 font-light">Loading...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}