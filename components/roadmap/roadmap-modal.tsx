'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Milestone {
  id: string;
  title: string;
  deadline: Date | undefined;
  subtasks: Subtask[];
}

interface RoadmapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoadmapModal({ open, onOpenChange }: RoadmapModalProps) {
  const [goal, setGoal] = useState('');
  const [goalDeadline, setGoalDeadline] = useState<Date | undefined>(new Date());
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: '1',
      title: '',
      deadline: undefined,
      subtasks: [{ id: '1-1', title: '', completed: false }]
    }
  ]);

  const addMilestone = () => {
    const newId = Date.now().toString();
    setMilestones([
      ...milestones,
      {
        id: newId,
        title: '',
        deadline: undefined,
        subtasks: [{ id: `${newId}-1`, title: '', completed: false }]
      }
    ]);
  };

  const removeMilestone = (id: string) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter(m => m.id !== id));
    }
  };

  const addSubtask = (milestoneId: string) => {
    setMilestones(milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          subtasks: [
            ...m.subtasks,
            { id: `${milestoneId}-${Date.now()}`, title: '', completed: false }
          ]
        };
      }
      return m;
    }));
  };

  const removeSubtask = (milestoneId: string, subtaskId: string) => {
    setMilestones(milestones.map(m => {
      if (m.id === milestoneId) {
        const newSubtasks = m.subtasks.filter(s => s.id !== subtaskId);
        // Ensure at least one subtask remains
        if (newSubtasks.length === 0) {
          newSubtasks.push({ id: `${milestoneId}-${Date.now()}`, title: '', completed: false });
        }
        return { ...m, subtasks: newSubtasks };
      }
      return m;
    }));
  };

  const handleMilestoneChange = (id: string, field: 'title' | 'deadline', value: string | Date | undefined) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleSubtaskChange = (milestoneId: string, subtaskId: string, value: string): void => {
    setMilestones(milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          subtasks: m.subtasks.map(s => 
            s.id === subtaskId ? { ...s, title: value } : s
          )
        };
      }
      return m;
    }));
  };

  const handleSave = (): void => {
    // TODO: Implement save logic with Supabase
    console.log('Saving roadmap:', { goal, goalDeadline, milestones });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Your Roadmap to Success</DialogTitle>
        </DialogHeader>

        {/* Goal Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Final Goal</h3>
            <Textarea
              placeholder="What's your ultimate goal?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !goalDeadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {goalDeadline ? format(goalDeadline, "PPP") : <span>Pick a deadline</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={goalDeadline}
                    onSelect={setGoalDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Milestones</h3>
              <Button size="sm" variant="outline" onClick={addMilestone}>
                <Plus className="h-4 w-4 mr-1" /> Add Milestone
              </Button>
            </div>

            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Milestone {index + 1}</h4>
                  {milestones.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeMilestone(milestone.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                
                <Textarea
                  placeholder="Describe this milestone"
                  value={milestone.title}
                  onChange={(e) => handleMilestoneChange(milestone.id, 'title', e.target.value)}
                  className="min-h-[80px]"
                />
                
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !milestone.deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {milestone.deadline ? (
                          format(milestone.deadline, "PPP")
                        ) : (
                          <span>Pick a deadline</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={milestone.deadline}
                        onSelect={(date) => handleMilestoneChange(milestone.id, 'deadline', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Subtasks */}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tasks</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => addSubtask(milestone.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Task
                    </Button>
                  </div>
                  
                  {milestone.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={(e) => {
                          const updatedSubtasks = milestone.subtasks.map(s => 
                            s.id === subtask.id 
                              ? { ...s, completed: e.target.checked } 
                              : s
                          );
                          setMilestones(milestones.map(m => 
                            m.id === milestone.id 
                              ? { ...m, subtasks: updatedSubtasks } 
                              : m
                          ));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Textarea
                        value={subtask.title}
                        onChange={(e) => handleSubtaskChange(milestone.id, subtask.id, e.target.value)}
                        placeholder="Task description"
                        className="flex-1 min-h-0 h-auto py-1.5"
                      />
                      {milestone.subtasks.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeSubtask(milestone.id, subtask.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Roadmap
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
