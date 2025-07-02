import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface RoadmapHeaderProps {
  roadmap: {
    id: string;
    final_goal: string;
    start_date?: string;
    end_date?: string;
    milestones?: Array<{
      tasks?: Array<{
        status: string;
      }>;
    }>;
  };
  progress: number;
  totalTasks: number;
  completedTasks: number;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
}

export function RoadmapHeader({
  roadmap,
  progress,
  totalTasks,
  completedTasks,
  isDeleteDialogOpen,
  isDeleting,
  onEditClick,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: RoadmapHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-4 bg-background/80 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{roadmap.final_goal}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(roadmap.start_date || '').toLocaleDateString()} -{' '}
            {new Date(roadmap.end_date || '').toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEditClick}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDeleteClick}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {completedTasks} of {totalTasks} tasks completed
          </span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={onDeleteCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Roadmap</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this roadmap? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onDeleteCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
