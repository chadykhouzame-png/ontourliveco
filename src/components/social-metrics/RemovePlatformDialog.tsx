import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlatformMetrics, PLATFORM_CONFIG } from './types';

interface RemovePlatformDialogProps {
  removeIndex: number | null;
  platforms: PlatformMetrics[];
  onConfirm: () => void;
  onCancel: () => void;
}

const RemovePlatformDialog = ({ removeIndex, platforms, onConfirm, onCancel }: RemovePlatformDialogProps) => {
  const platformName = removeIndex !== null && platforms[removeIndex]
    ? PLATFORM_CONFIG[platforms[removeIndex].platform]?.name
    : null;

  return (
    <AlertDialog open={removeIndex !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove platform?</AlertDialogTitle>
          <AlertDialogDescription>
            {platformName
              ? `Are you sure you want to remove ${platformName}? Any unsaved data for this platform will be lost.`
              : 'Are you sure you want to remove this platform?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemovePlatformDialog;
