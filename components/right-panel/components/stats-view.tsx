import { RightPanelView } from '../right-panel';
import { Users, CheckCircle2, DollarSign } from 'lucide-react';

export function StatsView() {
  return (
    <RightPanelView view="stats">
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">People in similar path</p>
              <p className="text-lg font-semibold">11 people</p>
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Already finished similar path</p>
              <p className="text-lg font-semibold">11 people</p>
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Raised for similar paths</p>
              <p className="text-lg font-semibold">$11 raised</p>
            </div>
          </div>
        </div>
      </div>
    </RightPanelView>
  );
}
