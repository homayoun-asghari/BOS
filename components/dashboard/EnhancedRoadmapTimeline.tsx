'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Position,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import CustomTaskNode from '@/components/dashboard/CustomTaskNode'; // Import your custom node
import { Zap, CheckCircle } from 'lucide-react';

// Define the node types to be used in React Flow
const nodeTypes = {
  // 'default' can be left undefined if you use React Flow's built-in default node
  // or define your own custom default if you want to override it globally.
  // Here, we'll let React Flow use its internal default for milestone nodes.
  taskNode: CustomTaskNode, // Register your custom task node component
};

const nodeWidth = 180;
const nodeHeight = 50; // This height might need adjustment if default nodes are taller/shorter than 50px

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Provide a default width/height for layout calculation if not already set by node type
    // Custom task nodes have their own width/height handled by their component,
    // but dagre needs dimensions for layout. Adjust these if your actual node sizes differ.
    dagreGraph.setNode(node.id, { width: node.width || nodeWidth, height: node.height || nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // We are updating the original node object with position
    node.position = {
      x: nodeWithPosition.x - (node.width || nodeWidth) / 2,
      y: nodeWithPosition.y - (node.height || nodeHeight) / 2,
    };
    // If you need specific source/target positions, ensure they are handled
    // for your custom nodes within their own component or via node.data.
    node.sourcePosition = node.sourcePosition || Position.Bottom;
    node.targetPosition = node.targetPosition || Position.Top;
  });

  return { nodes, edges };
}

interface EnhancedRoadmapTimelineProps {
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    start_date: string | null;
    end_date: string | null;
    order_index: number;
    roadmap_id: string;
    tasks: Array<{
      id: string;
      title: string;
      status: 'todo' | 'in_progress' | 'done';
      milestone_id: string;
      order_index: number;
      due_date?: string | null;
      priority?: 'low' | 'medium' | 'high';
    }>;
  }>;
  onTaskStatusChange: (taskId: string, status: 'todo' | 'in_progress' | 'done', priority?: 'low' | 'medium' | 'high') => Promise<boolean>;
}

export function EnhancedRoadmapTimeline({ 
  milestones, 
  onTaskStatusChange 
}: EnhancedRoadmapTimelineProps) {
  const { user } = useUser();
  // We'll manage baseNodes and baseEdges separately for the main roadmap structure
  const [baseNodes, setBaseNodes, onNodesChange] = useNodesState([]);
  const [baseEdges, setBaseEdges, onEdgesChange] = useEdgesState([]);

  // These will be the actual nodes/edges passed to ReactFlow, combining base and task nodes
  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  // Store tasks keyed by milestoneId
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});

  interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'done';
    milestone_id: string;
    order_index: number;
    due_date?: string | null;
    priority?: 'low' | 'medium' | 'high';
  }

  // Initialize tasks from milestones prop
  useEffect(() => {
    if (milestones && milestones.length > 0) {
      const initialTasks: Record<string, Task[]> = {};
      milestones.forEach(milestone => {
        if (milestone.id && milestone.tasks) {
          initialTasks[milestone.id] = milestone.tasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            milestone_id: task.milestone_id,
            order_index: task.order_index,
            due_date: task.due_date,
            priority: task.priority || 'medium' // Include priority with a default of 'medium'
          }));
        }
      });
      setTasks(prev => ({
        ...prev,
        ...initialTasks
      }));
    }
  }, [milestones]);

  // Function to update task status
  const handleTaskStatusChange = useCallback(async (taskId: string, status: 'todo' | 'in_progress' | 'done') => {
    if (!selectedMilestone) return false;
    
    try {
      // Update local state optimistically
      setTasks(prev => ({
        ...prev,
        [selectedMilestone]: prev[selectedMilestone].map(task => 
          task.id === taskId ? { ...task, status } : task
        )
      }));
      
      // Call the parent's onTaskStatusChange
      const success = await onTaskStatusChange(taskId, status);
      if (!success) {
        // Revert if the update fails
        setTasks(prev => ({
          ...prev,
          [selectedMilestone]: prev[selectedMilestone].map(task => 
            task.id === taskId ? { ...task, status: task.status } : task
          )
        }));
      }
      return success;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  }, [selectedMilestone, onTaskStatusChange]);
  
  // Function to fetch tasks for a specific milestone (kept for backward compatibility)
  const fetchTasks = useCallback(async (milestoneId: string) => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      if (data) {
        // Update the tasks state with the fresh data from the database
        setTasks(prev => ({
          ...prev,
          [milestoneId]: data.map(task => ({
            ...task,
            // Ensure status is one of the expected values
            status: ['todo', 'in_progress', 'done'].includes(task.status) 
              ? task.status 
              : 'todo',
            // Ensure priority has a default value if not set
            priority: task.priority || 'medium'
          }))
        }));
      }
    } catch (err) {
      console.error('Error in fetchTasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Function to handle toggling task status (passed to custom node)
  const toggleTaskStatus = useCallback(async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    console.log('toggleTaskStatus called with:', { taskId, newStatus, user, selectedMilestone });
    
    if (!user || !selectedMilestone) {
      console.error('Cannot update task: User or milestone not selected');
      return false;
    }
    
    return handleTaskStatusChange(taskId, newStatus);
  }, [user, selectedMilestone, handleTaskStatusChange]);

  // Handle click on a main roadmap node
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Only allow clicking on milestone nodes, not start/end or task nodes
    if (node.id === 'start' || node.id === 'end' || node.type === 'taskNode') return;
    
    // If clicking the currently selected milestone, close it
    if (selectedMilestone === node.id) {
      setSelectedMilestone(null);
      return;
    }
    
    // If we already have tasks for this milestone, just update the selection
    if (tasks[node.id] && tasks[node.id].length > 0) {
      setSelectedMilestone(node.id);
      return;
    }
    
    // Otherwise, fetch the tasks for this milestone
    fetchTasks(node.id);
    setSelectedMilestone(node.id);
  }, [selectedMilestone, fetchTasks, tasks]);

  // Initial data fetch for the main roadmap
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Only fetch if we don't already have nodes
    if (baseNodes.length > 0) {
      return;
    }
    
    setLoading(true);
    try {
      const { data: roadmap, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roadmapError || !roadmap) {
        console.error('Error fetching roadmap:', roadmapError);
        return;
      }

      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('roadmap_id', roadmap.id)
        .order('order_index', { ascending: true });

      if (milestonesError) {
        console.error('Error fetching milestones:', milestonesError);
        return;
      }

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // Start Node
      nodes.push({
        id: 'start',
        data: { 
          label: (
            <div className="flex items-center justify-center w-full gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Start</span>
            </div>
          )
        },
        position: { x: 0, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        className: 'border border-border bg-muted/30 text-muted-foreground dark:bg-muted/30 dark:border-border/50 dark:text-muted-foreground',
        style: { 
          width: '200px',
          height: 'auto',
          borderRadius: '0.375rem',
          padding: '0.5rem',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
        },
        type: 'default',
        draggable: false,
        selectable: false,
      });

      // Milestone Nodes
      milestones?.forEach((m, i) => {
        nodes.push({
          id: m.id,
          data: { label: m.title },
          position: { x: 0, y: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          type: 'default',
          className: 'border border-border bg-muted/30 text-muted-foreground dark:bg-muted/30 dark:border-border/50 dark:text-muted-foreground transition-all duration-200 hover:shadow-md hover:bg-muted/50 dark:hover:bg-muted/50 cursor-pointer',
          style: { 
            width: '200px',
            height: 'auto',
            borderRadius: '0.375rem',
            padding: '0.5rem',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
          },
          draggable: false,
        });

        edges.push({
          id: `e-${i}`,
          source: i === 0 ? 'start' : milestones[i - 1].id,
          target: m.id,
          animated: true,
          type: 'smoothstep',
          style: { 
            stroke: 'hsl(214.3 31.8% 91.4%)',
            strokeWidth: 2,
            strokeDasharray: '4 2'
          },
        });
      });

      // End Node
      nodes.push({
        id: 'end',
        data: { 
          label: (
            <div className="flex items-center justify-center w-full gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>End</span>
            </div>
          )
        },
        position: { x: 0, y: 0 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        className: 'border border-border bg-muted/30 text-muted-foreground dark:bg-muted/30 dark:border-border/50 dark:text-muted-foreground',
        style: { 
          width: '200px',
          height: 'auto',
          borderRadius: '0.375rem',
          padding: '0.5rem',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
        },
        type: 'default',
        draggable: false,
        selectable: false,
      });

      // Edge from last milestone to End
      if (milestones && milestones.length > 0) {
        edges.push({
          id: 'e-final',
          source: milestones[milestones.length - 1].id,
          target: 'end',
          animated: true,
          type: 'smoothstep',
          style: { 
            stroke: 'hsl(214.3 31.8% 91.4%)',
            strokeWidth: 2,
            strokeDasharray: '4 2'
          },
        });
      }

      // Layout the initial roadmap elements
      const layouted = getLayoutedElements(nodes, edges);
      setBaseNodes(layouted.nodes);
      setBaseEdges(layouted.edges);
      setReactFlowNodes(layouted.nodes);
      setReactFlowEdges(layouted.edges);
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  }, [user, baseNodes.length]);

  // Create a stable reference to fetchData that won't change on re-renders
  const stableFetchData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Fetch initial roadmap data on component mount only once
  useEffect(() => {
    stableFetchData();
  }, [stableFetchData]);
  
  // Debug effect to log when toggleTaskStatus changes
  // Removed as it's not needed in production

  // Effect to update ReactFlow nodes/edges when selectedMilestone or tasks change
  useEffect(() => {
    // If no milestone is selected or no tasks for the selected milestone,
    // or if tasks[selectedMilestone] is an empty array,
    // revert to just the base roadmap nodes and edges.
    if (!selectedMilestone || !tasks[selectedMilestone] || tasks[selectedMilestone]?.length === 0) {
      setReactFlowNodes(baseNodes);
      setReactFlowEdges(baseEdges);
      return;
    }

    const taskList = tasks[selectedMilestone];
    const milestoneNode = baseNodes.find((n) => n.id === selectedMilestone);

    // Calculate starting position for task nodes relative to the milestone node
    // Adjusted offsets to make space for the task list
    const startX = (milestoneNode?.position?.x ?? 0) + (nodeWidth / 2) + 150; // Offset to the right of milestone
    const startY = (milestoneNode?.position?.y ?? 0) - (taskList.length * 70) / 2 + 35; // Center vertically on milestone

    const taskNodes: Node[] = taskList.map((task, index) => {
      console.log('Creating task node:', { 
        taskId: task.id, 
        status: task.status, 
        hasToggleFn: !!toggleTaskStatus 
      });
      
      // Create a stable reference to toggleTaskStatus with type safety
      const handleStatusChange = (taskId: string, newStatus: string) => {
        console.log('Task status change requested:', { taskId, newStatus });
        // Ensure the status is one of the allowed values
        if (['todo', 'in_progress', 'done'].includes(newStatus)) {
          toggleTaskStatus(taskId, newStatus as 'todo' | 'in_progress' | 'done');
        } else {
          console.error('Invalid task status:', newStatus);
        }
      };
      
      return {
        id: `task-${task.id}`,
        type: 'taskNode',
        position: { x: startX, y: startY + index * 70 }, // 70px spacing between tasks
        data: {
          task: task,
          onTaskStatusChange: handleStatusChange,
        },
        // You can define a width/height here for Dagre layout if taskNode has a fixed width
        // otherwise, let CustomTaskNode manage its own size.
        // Make sure these match CustomTaskNode.tsx's internal width/height for accurate layout.
        width: 240, // Match the width in CustomTaskNode.tsx
        height: 60, // Approximate height for layout, CustomTaskNode.tsx will render actual height
        draggable: false, // Task nodes shouldn't be draggable
        selectable: false, // Task nodes shouldn't be selectable in the React Flow sense
      };
    });

    const taskEdges: Edge[] = [];
    if (taskNodes.length > 0 && milestoneNode) {
      // Edge from milestone to the first task node
      taskEdges.push({
        id: `edge-${selectedMilestone}-to-task-${taskNodes[0].id}`,
        source: selectedMilestone,
        // The milestone's source position is Bottom. We want to connect to the task's Left handle.
        // React Flow's 'smoothstep' type is usually good at finding the nearest handle.
        sourceHandle: 's', // Assuming default milestone has 's' handle at bottom if not specified
        target: taskNodes[0].id,
        targetHandle: 'target', // The id of the Handle in CustomTaskNode.tsx for incoming edges
        animated: true,
        type: 'smoothstep',
        style: { 
          stroke: 'hsl(214.3 31.8% 91.4%)', // border
          strokeWidth: 2,
          strokeDasharray: '4 2' // subtle dashed line
        },
      });

      // Edges between task nodes
      for (let i = 0; i < taskNodes.length - 1; i++) {
        taskEdges.push({
          id: `edge-${taskNodes[i].id}-to-${taskNodes[i + 1].id}`,
          source: taskNodes[i].id,
          sourceHandle: 'source', // The id of the Handle in CustomTaskNode.tsx for outgoing edges
          target: taskNodes[i + 1].id,
          targetHandle: 'target', // The id of the Handle in CustomTaskNode.tsx for incoming edges
          animated: true,
          type: 'smoothstep',
          style: { 
          stroke: 'hsl(214.3 31.8% 91.4%)', // border
          strokeWidth: 2,
          strokeDasharray: '4 2' // subtle dashed line
        },
        });
      }
    }

    // Combine base roadmap elements with dynamic task elements
    setReactFlowNodes([...baseNodes, ...taskNodes]);
    setReactFlowEdges([...baseEdges, ...taskEdges]);
  }, [selectedMilestone, tasks, baseNodes, baseEdges, toggleTaskStatus]); // Add toggleTaskStatus to dependencies

  if (loading) {
    return <div className="p-4 text-center">Loading Roadmap...</div>;
  }

  return (
    <div className="h-[700px] w-full">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange} // Allow React Flow to manage node positions/selections
        onEdgesChange={onEdgesChange} // Allow React Flow to manage edge selections/removals
        onNodeClick={handleNodeClick} // Custom handler for milestone clicks
        nodeTypes={nodeTypes} // Pass your custom node types here
        fitView // Zoom to fit all elements initially
        panOnScroll={false} // Disable panning with scroll wheel for better UX with checklists
        zoomOnScroll={false} // Disable zooming with scroll wheel
        zoomOnPinch={false} // Disable zooming with pinch gestures
        zoomOnDoubleClick={false} // Disable zooming on double click
        nodesDraggable={false} // Prevent all nodes from being dragged
        proOptions={{ hideAttribution: true }} // Hide React Flow attribution in production
      >
        <Background style={{ backgroundColor: 'transparent' }} color="transparent" />
        <Controls showInteractive={false} /> {/* Hide built-in interactive controls (zoom, pan buttons) */}
      </ReactFlow>
    </div>
  );
}