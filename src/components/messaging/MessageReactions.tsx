import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🔥', '🎵', '👏', '😮', '🙌'];

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onToggleReaction: (emoji: string) => void;
  isOwn: boolean;
}

const MessageReactions = ({ reactions, onToggleReaction, isOwn }: MessageReactionsProps) => {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onToggleReaction(emoji);
    setOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-1 flex-wrap mt-1', isOwn ? 'justify-end' : 'justify-start')}>
      {reactions.filter(r => r.count > 0).map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onToggleReaction(reaction.emoji)}
          className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors',
            reaction.reacted
              ? 'bg-primary/15 border-primary/30 text-foreground'
              : 'bg-muted/50 border-border hover:bg-muted text-muted-foreground'
          )}
        >
          <span>{reaction.emoji}</span>
          <span className="min-w-[0.75rem] text-center">{reaction.count}</span>
        </button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side={isOwn ? 'left' : 'right'} align="start">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MessageReactions;
