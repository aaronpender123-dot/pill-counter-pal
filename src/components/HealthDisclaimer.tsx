import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HealthDisclaimer() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-left">
      <div className="flex gap-2 items-start">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">For reference only.</strong>{' '}
          Not a medical device. Always verify counts manually.{' '}
          <Link to="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
