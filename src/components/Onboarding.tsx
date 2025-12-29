import { useState } from 'react';
import { Camera, AlertTriangle, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { CapsuleLogo } from '@/components/CapsuleLogo';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);

  const steps = [
    {
      icon: 'capsule' as const,
      title: 'Welcome to PillCount',
      description: 'AI-powered pill counting for quick and easy reference counts.',
    },
    {
      icon: Camera,
      title: 'How It Works',
      description: 'Simply take a photo of your pills on a flat surface, and our AI will count them for you.',
    },
    {
      icon: Shield,
      title: 'Your Privacy Matters',
      description: 'Images are processed in real-time and never stored. We do not collect any personal data.',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleGetStarted = () => {
    if (acceptedDisclaimer) {
      localStorage.setItem('pillcount_onboarding_complete', 'true');
      onComplete();
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  const renderIcon = () => {
    if (currentStepData.icon === 'capsule') {
      return <CapsuleLogo size="xl" />;
    }
    const IconComponent = currentStepData.icon;
    return <IconComponent className="h-12 w-12 text-primary-foreground" />;
  };

  return (
    <div className="min-h-screen gradient-surface flex flex-col">
      <div className="flex-1 container max-w-lg mx-auto px-4 py-8 flex flex-col">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-primary/60'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
          <div className="w-24 h-24 rounded-3xl gradient-primary shadow-soft flex items-center justify-center">
            {renderIcon()}
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              {steps[currentStep].title}
            </h1>
            <p className="text-muted-foreground text-lg max-w-sm">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Disclaimer Section - Only on last step */}
          {isLastStep && (
            <div className="w-full space-y-4 animate-scale-in">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Important Disclaimer</h3>
                    <p className="text-sm text-muted-foreground">
                      PillCount is designed for <strong>reference purposes only</strong>. 
                      This app is not a medical device and should not be used for medical decisions. 
                      Always verify pill counts manually and consult healthcare professionals 
                      for medical advice.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left">
                <Checkbox
                  id="disclaimer"
                  checked={acceptedDisclaimer}
                  onCheckedChange={(checked) => setAcceptedDisclaimer(checked === true)}
                  className="mt-1"
                />
                <label htmlFor="disclaimer" className="text-sm text-muted-foreground cursor-pointer">
                  I understand that PillCount is for reference only and not intended for medical use. 
                  I agree to the{' '}
                  <Link to="/privacy" className="text-primary underline">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="space-y-4 pt-8">
          {isLastStep ? (
            <Button
              onClick={handleGetStarted}
              disabled={!acceptedDisclaimer}
              variant="capture"
              size="xl"
              className="w-full"
            >
              Get Started
              <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              variant="capture"
              size="xl"
              className="w-full"
            >
              Continue
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          {!isLastStep && (
            <Button
              onClick={() => setCurrentStep(steps.length - 1)}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              Skip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
