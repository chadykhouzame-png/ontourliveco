import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialPlatform, PLATFORM_CONFIG } from './types';

interface AddPlatformButtonsProps {
  availablePlatforms: SocialPlatform[];
  onAdd: (platform: SocialPlatform) => void;
}

const AddPlatformButtons = ({ availablePlatforms, onAdd }: AddPlatformButtonsProps) => {
  if (availablePlatforms.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {availablePlatforms.map(platform => {
        const config = PLATFORM_CONFIG[platform];
        const Icon = config.icon;
        return (
          <Button
            key={platform}
            variant="outline"
            size="sm"
            onClick={() => onAdd(platform)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <Icon className={cn("w-3.5 h-3.5", config.color)} />
            {config.name}
          </Button>
        );
      })}
    </div>
  );
};

export default AddPlatformButtons;
