import { useEffect, useState } from 'react';
import { Database, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function TrainingStats() {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: totalCount, error } = await supabase
          .from('pill_training_data')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        setCount(totalCount ?? 0);
      } catch (err) {
        console.error('Error fetching training stats:', err);
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="bg-card/50 rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">Community Training Data</p>
          <div className="flex items-baseline gap-1">
            {isLoading ? (
              <span className="text-lg font-semibold text-foreground animate-pulse">...</span>
            ) : (
              <>
                <span className="text-2xl font-bold text-foreground">{count}</span>
                <span className="text-sm text-muted-foreground">
                  image{count !== 1 ? 's' : ''} contributed
                </span>
              </>
            )}
          </div>
        </div>
        <Image className="h-5 w-5 text-muted-foreground/50" />
      </div>
    </div>
  );
}
