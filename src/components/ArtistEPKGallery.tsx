import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Image, Download, FileText, Camera, Palette, Loader2 } from 'lucide-react';

const FILE_TYPE_LABELS: Record<string, string> = {
  promo_photo: 'Promo Photo',
  logo: 'Logo',
  stage_shot: 'Stage Shot',
  press_kit_pdf: 'Press Kit',
};

interface MediaItem {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
}

interface ArtistEPKGalleryProps {
  artistId: string;
  artistName: string;
}

export const ArtistEPKGallery = ({ artistId, artistName }: ArtistEPKGalleryProps) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      const { data } = await supabase
        .from('artist_media')
        .select('id, file_url, file_name, file_type')
        .eq('artist_id', artistId)
        .order('sort_order', { ascending: true });

      if (data) setMedia(data as MediaItem[]);
      setIsLoading(false);
    };
    fetchMedia();
  }, [artistId]);

  const handleDownload = async (item: MediaItem) => {
    try {
      const response = await fetch(item.file_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.file_url, '_blank');
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

  if (media.length === 0) return null;

  const images = media.filter(m => m.file_type !== 'press_kit_pdf');
  const pdfs = media.filter(m => m.file_type === 'press_kit_pdf');

  return (
    <>
      <Card className="glass border-border/50 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-secondary/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="w-5 h-5 text-artist" />
            Press Kit
          </CardTitle>
          <CardDescription>
            Download promo materials for {artistName}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Image grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl overflow-hidden border border-border/30 cursor-pointer"
                  onClick={() => setLightboxUrl(item.file_url)}
                >
                  <img
                    src={item.file_url}
                    alt={item.file_name}
                    className="aspect-square object-cover w-full transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                    <Badge variant="secondary" className="text-xs backdrop-blur-sm bg-background/70">
                      {FILE_TYPE_LABELS[item.file_type]}
                    </Badge>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item);
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PDF downloads */}
          {pdfs.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleDownload(item)}
            >
              <FileText className="w-5 h-5 text-artist shrink-0" />
              <div className="text-left flex-1 min-w-0">
                <p className="font-medium truncate">{item.file_name}</p>
                <p className="text-xs text-muted-foreground">Press Kit PDF</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground shrink-0" />
            </Button>
          ))}

          {/* Download all button */}
          {media.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => media.forEach(m => handleDownload(m))}
            >
              <Download className="w-4 h-4 mr-2" />
              Download All ({media.length} files)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-0 bg-black/90 border-none">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Press kit image"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ArtistEPKGallery;
