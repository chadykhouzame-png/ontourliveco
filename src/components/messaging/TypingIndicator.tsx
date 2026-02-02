import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  userName: string;
  userImage?: string | null;
}

const TypingIndicator = ({ userName, userImage }: TypingIndicatorProps) => {
  return (
    <div className="flex gap-3 items-end animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={userImage || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {userName?.charAt(0).toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-2xl px-4 py-3">
        <div className="flex gap-1 items-center">
          <div className="flex gap-1">
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
              style={{ animationDelay: '0ms', animationDuration: '600ms' }} 
            />
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
              style={{ animationDelay: '150ms', animationDuration: '600ms' }} 
            />
            <span 
              className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" 
              style={{ animationDelay: '300ms', animationDuration: '600ms' }} 
            />
          </div>
          <span className="text-xs text-muted-foreground ml-2">
            {userName} is typing
          </span>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
