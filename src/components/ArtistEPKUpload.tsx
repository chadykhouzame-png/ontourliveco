import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, Upload, Trash2, FileText, Loader2, Camera, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_UPLOADS = 5;

const FILE_TYPE_LABELS: Record<string, string> = {
  promo_photo: 'Promo Photo',
  logo: 'Logo / Branding',
  stage_shot: 'Stage / Live Shot',
  press_kit_pdf: 'Press Kit (PDF)',
};

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  promo_photo: <Camera className="w-4 h-4" />,
  logo: <Palette className="w-4 h-4" />,
  stage_shot: <Image className="w-4 h-4" />,
  press_kit_pdf: <FileText className="w-4 h-4" />,
};

interface MediaItem {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  sort_order: number;
}

interface ArtistEPKUploadProps {
  artistId: string;
}

export const ArtistEPKUpload = ({ artistId }: ArtistEPKUploadProps) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('promo_photo');
  const { toast } = useToast();

  const fetchMedia = useCallback(async () => {
    const { data, error } = await supabase
      .from('artist_media')
      .select('*')
      .eq('artist_id', artistId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setMedia(data as MediaItem[]);
    }
    setIsLoading(false);
  }, [artistId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (media.length >= MAX_UPLOADS) {
      toast({ title: 'Upload limit reached', description: `You can upload up to ${MAX_UPLOADS} files.`, variant: 'destructive' });
      return;
    }

    // Validate file type
    const isPDF = selectedType === 'press_kit_pdf';
    if (isPDF && file.type !== 'application/pdf') {
      toast({ title: 'Invalid file', description: 'Please upload a PDF file for press kits.', variant: 'destructive' });
      return;
    }
    if (!isPDF && !file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${artistId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('artist-media')
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artist-media')
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from('artist_media')
        .insert({
          artist_id: artistId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: selectedType,
          file_size: file.size,
          sort_order: media.length,
        });

      if (insertError) throw insertError;

      toast({ title: 'Uploaded!', description: `${FILE_TYPE_LABELS[selectedType]} added to your EPK.` });
      fetchMedia();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (item: MediaItem) => {
    try {
      // Extract path from URL
      const urlParts = item.file_url.split('/artist-media/');
      const storagePath = urlParts[1];

      if (storagePath) {
        await supabase.storage.from('artist-media').remove([storagePath]);
      }

      const { error } = await supabase
        .from('artist_media')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setMedia(prev => prev.filter(m => m.id !== item.id));
      toast({ title: 'Deleted', description: 'Media removed from your EPK.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card className="glass border-border/50 rounded-2xl">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/30 bg-secondary/20">
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5 text-artist" />
          EPK / Press Kit
        </CardTitle>
        <CardDescription>
          Upload promo photos, logos, and your press kit for venues to download ({media.length}/{MAX_UPLOADS})
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Upload controls */}
        {media.length < MAX_UPLOADS && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promo_photo">📸 Promo Photo</SelectItem>
                  <SelectItem value="logo">🎨 Logo / Branding</SelectItem>
                  <SelectItem value="stage_shot">🎤 Stage / Live Shot</SelectItem>
                  <SelectItem value="press_kit_pdf">📄 Press Kit (PDF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label>
              <input
                type="file"
                className="hidden"
                accept={selectedType === 'press_kit_pdf' ? '.pdf' : 'image/*'}
                onChange={handleUpload}
                disabled={isUploading}
              />
              <Button asChild disabled={isUploading} variant="outline" className="haptic">
                <span>
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload
                </span>
              </Button>
            </label>
          </div>
        )}

        {/* Media grid */}
        {media.length === 0 ? (
          <div className="text-center py-6">
            <Image className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No EPK media yet. Upload your first file above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {media.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-border/50 overflow-hidden bg-secondary/20"
              >
                {item.file_type === 'press_kit_pdf' ? (
                  <div className="aspect-square flex flex-col items-center justify-center gap-2 p-4">
                    <FileText className="w-10 h-10 text-artist" />
                    <p className="text-xs text-muted-foreground text-center truncate w-full">{item.file_name}</p>
                  </div>
                ) : (
                  <img
                    src={item.file_url}
                    alt={item.file_name}
                    className="aspect-square object-cover w-full"
                  />
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs backdrop-blur-sm bg-background/70">
                    {FILE_TYPE_ICONS[item.file_type]}
                    <span className="ml-1">{FILE_TYPE_LABELS[item.file_type]}</span>
                  </Badge>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArtistEPKUpload;
