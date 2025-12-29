import { useState, useEffect } from 'react';
import { PillCounter } from '@/components/PillCounter';
import { Onboarding } from '@/components/Onboarding';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const onboardingComplete = localStorage.getItem('pillcount_onboarding_complete');
    setShowOnboarding(!onboardingComplete);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return <PillCounter />;
};

export default Index;
