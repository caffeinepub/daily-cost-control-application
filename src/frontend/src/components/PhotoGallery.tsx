import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, ExternalLink, Upload, Loader2, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useGetPhotos, useUploadPhoto, useGetCallerUserProfile, useIsCallerAdmin, useIsScoreAuthAdmin, useDeletePhoto } from '@/hooks/useQueries';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { ExternalBlob } from '@/backend';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

type PhotoItem = {
  url: string;
  caption: string;
  isStatic: boolean;
  id: string;
  photoKey?: string;
  uploaderPrincipal?: string;
  canDelete: boolean;
};

export default function PhotoGallery() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: isScoreAuthAdmin } = useIsScoreAuthAdmin();
  const { data: photosData = [], isLoading: photosLoading } = useGetPhotos();
  const uploadMutation = useUploadPhoto();
  const deleteMutation = useDeletePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [deletingPhotoKey, setDeletingPhotoKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const hasAdminAccess = isAdmin || isScoreAuthAdmin;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    if (!userProfile?.name) {
      toast.error('User profile not found');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      await uploadMutation.mutateAsync({
        blob,
        uploaderName: userProfile.name,
      });

      toast.success('Photo uploaded successfully!');
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      setUploadProgress(0);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeletePhoto = async (photoKey: string) => {
    setDeletingPhotoKey(photoKey);
    try {
      await deleteMutation.mutateAsync(photoKey);
      toast.success('Photo deleted successfully');
      setDialogOpen(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error?.message || 'Failed to delete photo';
      toast.error(errorMessage);
    } finally {
      setDeletingPhotoKey(null);
    }
  };

  const allPhotos: PhotoItem[] = [
    { 
      url: '/assets/generated/tournament-action.dim_800x600.jpg', 
      caption: 'Tournament Action', 
      isStatic: true, 
      id: 'static-1',
      photoKey: undefined,
      canDelete: false,
    },
    ...photosData.map(([photoKey, photoData]) => ({
      url: photoData.blob.getDirectURL(),
      caption: `Added by ${photoData.uploaderName}`,
      isStatic: false,
      id: photoKey,
      photoKey: photoKey,
      uploaderPrincipal: photoData.uploader.toString(),
      canDelete: true,
    })),
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Photo Gallery
            </CardTitle>
            <CardDescription>Photos from our fellowship events and matches</CardDescription>
          </div>
          {hasAdminAccess && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={handleUploadClick}
                disabled={uploadMutation.isPending}
                size="sm"
                className="gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        {isAuthenticated && !hasAdminAccess && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg mt-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <p>Photo uploads are restricted to admins only</p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-4">
            {photosLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : allPhotos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allPhotos.map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-border group">
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        className="w-full h-full object-cover"
                      />
                      {!photo.isStatic && hasAdminAccess && photo.photoKey && photo.canDelete && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AlertDialog open={dialogOpen === photo.photoKey} onOpenChange={(open) => setDialogOpen(open ? (photo.photoKey ?? null) : null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8 shadow-lg"
                                disabled={deletingPhotoKey === photo.photoKey}
                              >
                                {deletingPhotoKey === photo.photoKey ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this photo uploaded by {photo.caption.replace('Added by ', '')}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deletingPhotoKey === photo.photoKey}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDeletePhoto(photo.photoKey!);
                                  }}
                                  disabled={deletingPhotoKey === photo.photoKey}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingPhotoKey === photo.photoKey ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground text-center">{photo.caption}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No photos yet</p>
                {hasAdminAccess && (
                  <p className="text-sm text-muted-foreground mt-2">Be the first to upload a photo!</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="facebook" className="space-y-4">
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground">
                <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="mb-2">View our latest photos on Facebook</p>
                <p className="text-sm">Follow us for updates on matches, tournaments, and fellowship events</p>
              </div>
              <Button asChild>
                <a
                  href="https://www.facebook.com/share/g/1F4wCVyt5Y/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Visit Facebook Page
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="instagram" className="space-y-4">
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground">
                <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Follow us on Instagram</p>
                <p className="text-sm">See behind-the-scenes moments and player highlights</p>
              </div>
              <Button asChild>
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Visit Instagram Profile
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
