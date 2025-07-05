import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  isActive?: boolean;
  title: string;
}

export function ToolbarButton({ 
  icon, 
  isActive, 
  title, 
  className,
  ...props 
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "p-1.5 rounded-md hover:bg-muted transition-colors",
        isActive && "bg-muted",
        props.disabled && "opacity-40 cursor-not-allowed",
        className
      )}
      title={title}
      {...props}
    >
      {icon}
    </button>
  );
}
