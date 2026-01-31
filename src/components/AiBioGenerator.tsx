import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type BioStyle = 'professional' | 'energetic' | 'underground';

interface AiBioGeneratorProps {
  artistName: string;
  city: string;
  genres: string[];
  onBioGenerated: (bio: string) => void;
  disabled?: boolean;
}

const AiBioGenerator = ({
  artistName,
  city,
  genres,
  onBioGenerated,
  disabled = false,
}: AiBioGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [style, setStyle] = useState<BioStyle>('professional');
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!artistName.trim() || !city.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter your artist name and city first.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-artist-bio', {
        body: {
          artistName: artistName.trim(),
          city: city.trim(),
          genres,
          style,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.bio) {
        onBioGenerated(data.bio);
        toast({
          title: "Bio generated!",
          description: "Feel free to edit it to make it your own.",
        });
      }
    } catch (error) {
      console.error('Error generating bio:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate bio';
      
      toast({
        variant: "destructive",
        title: "Couldn't generate bio",
        description: errorMessage.includes('Rate limit') 
          ? "Too many requests. Please wait a moment and try again."
          : errorMessage.includes('credits')
          ? "AI service temporarily unavailable. Please try again later."
          : "Something went wrong. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select value={style} onValueChange={(value) => setStyle(value as BioStyle)}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select style" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="professional">Professional</SelectItem>
          <SelectItem value="energetic">Energetic & Fun</SelectItem>
          <SelectItem value="underground">Underground</SelectItem>
        </SelectContent>
      </Select>
      
      <Button
        type="button"
        variant="outline"
        size="default"
        onClick={handleGenerate}
        disabled={disabled || isGenerating || !artistName.trim() || !city.trim()}
        className="gap-2 border-artist/30 text-artist hover:bg-artist/10 hover:text-artist"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </>
        )}
      </Button>
    </div>
  );
};

export default AiBioGenerator;
