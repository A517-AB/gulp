import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@renderer/ui/card';
import { Badge } from '@renderer/ui/badge';
import { Button } from '@renderer/ui/button';
import { ScrollArea } from '@renderer/ui/scroll-area';

type TaskStatus = 'queued' | 'running' | 'completed';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

export default function FleetPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 't-1', title: 'Analyze project structure', status: 'completed' },
    { id: 't-2', title: 'Generate routing logic', status: 'running' },
    { id: 't-3', title: 'Implement new UI components', status: 'queued' },
    { id: 't-4', title: 'Write unit tests for utils', status: 'queued' },
  ]);

  const handleNewTask = () => {
    const newTask: Task = {
      id: `t-${tasks.length + 1}`,
      title: `New Task ${tasks.length + 1}`,
      status: 'queued',
    };
    setTasks([...tasks, newTask]);
  };

  const getBadgeVariant = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'running':
        return 'secondary';
      case 'queued':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-background text-foreground gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Task Queue</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor your automated tasks.</p>
        </div>
        <Button onClick={handleNewTask}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          New Task
        </Button>
      </div>

      <ScrollArea className="flex-1 rounded-md border p-4 bg-card/50">
        <div className="flex flex-col gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  {task.title}
                  <span className="ml-2 text-xs text-muted-foreground font-normal">#{task.id}</span>
                </CardTitle>
                <Badge variant={getBadgeVariant(task.status)}>
                  {task.status.toUpperCase()}
                </Badge>
              </CardHeader>
            </Card>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              No tasks in the queue.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
