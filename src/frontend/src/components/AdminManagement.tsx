import { useGetScoreAuthAdmins, useAppointScoreAuthAdmin, useRemoveScoreAuthAdmin, useIsCallerAdmin, useGetMemberDirectory, useCreateMemberWithClaimCode, useGetUnclaimedMembers, useIsScoreAuthAdmin, useUpdateMemberPhoto, useGetSchedule, useGetPhotos, useDeleteMember, useGetLeaderboard } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, UserPlus, UserMinus, AlertCircle, Crown, Key, Copy, CheckCircle2, Users, UserCheck, Camera, X, Trash2, Image } from 'lucide-react';
import { useState, useRef } from 'react';
import { Principal } from '@icp-sdk/core/principal';
import type { PublicMemberDirectoryEntry, MemberProfile } from '../backend';
import { toast } from 'sonner';
import AdminBannerManager from './AdminBannerManager';

export default function AdminManagement() {
  const { identity } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminCheckLoading } = useIsCallerAdmin();
  const { data: isScoreAuthAdmin, isLoading: scoreAuthCheckLoading } = useIsScoreAuthAdmin();
  const { data: scoreAuthAdmins, isLoading: adminsLoading } = useGetScoreAuthAdmins();
  const { data: members } = useGetMemberDirectory();
  const { data: leaderboard } = useGetLeaderboard();
  const { data: claimMembers, isLoading: claimMembersLoading } = useGetUnclaimedMembers();
  const appointAdmin = useAppointScoreAuthAdmin();
  const removeAdmin = useRemoveScoreAuthAdmin();
  const createClaimMember = useCreateMemberWithClaimCode();
  const updateMemberPhoto = useUpdateMemberPhoto();
  const deleteMember = useDeleteMember();
  
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [isAppointDialogOpen, setIsAppointDialogOpen] = useState(false);
  const [isCreateMemberDialogOpen, setIsCreateMemberDialogOpen] = useState(false);
  const [isUpdatePhotoDialogOpen, setIsUpdatePhotoDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhoto, setNewMemberPhoto] = useState<Uint8Array | null>(null);
  const [newMemberPhotoPreview, setNewMemberPhotoPreview] = useState<string | null>(null);
  const [updatePhotoData, setUpdatePhotoData] = useState<Uint8Array | null>(null);
  const [updatePhotoPreview, setUpdatePhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updatePhotoInputRef = useRef<HTMLInputElement>(null);

  const isAuthenticated = !!identity;
  const hasAdminAccess = isAdmin || isScoreAuthAdmin;

  const getMemberName = (principal: string) => {
    const member = members?.find(m => {
      return m.isClaimed;
    });
    return member?.name || 'Unknown';
  };

  const getMemberImage = (photo: Uint8Array | undefined) => {
    if (photo) {
      const blob = new Blob([new Uint8Array(photo)], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    }
    return '/assets/generated/default-avatar.dim_100x100.png';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      setNewMemberPhoto(uint8Array);
      setNewMemberPhotoPreview(URL.createObjectURL(file));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpdatePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      setUpdatePhotoData(uint8Array);
      setUpdatePhotoPreview(URL.createObjectURL(file));
    };
    reader.readAsArrayBuffer(file);
  };

  const clearPhoto = () => {
    setNewMemberPhoto(null);
    setNewMemberPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearUpdatePhoto = () => {
    setUpdatePhotoData(null);
    setUpdatePhotoPreview(null);
    if (updatePhotoInputRef.current) {
      updatePhotoInputRef.current.value = '';
    }
  };

  const handleAppointAdmin = async () => {
    if (!selectedMember) {
      setError('Please select a member');
      return;
    }

    setError('');
    try {
      const principal = Principal.fromText(selectedMember);
      await appointAdmin.mutateAsync(principal);
      setIsAppointDialogOpen(false);
      setSelectedMember('');
    } catch (err: any) {
      setError(err.message || 'Failed to appoint admin');
    }
  };

  const handleRemoveAdmin = async (principal: string) => {
    setError('');
    try {
      const principalObj = Principal.fromText(principal);
      await removeAdmin.mutateAsync(principalObj);
    } catch (err: any) {
      setError(err.message || 'Failed to remove admin');
    }
  };

  const handleCreateMember = async () => {
    if (!newMemberName.trim()) {
      setError('Please enter a member name');
      return;
    }

    setError('');
    try {
      await createClaimMember.mutateAsync({ name: newMemberName.trim(), photo: newMemberPhoto });
      setIsCreateMemberDialogOpen(false);
      setNewMemberName('');
      setNewMemberPhoto(null);
      setNewMemberPhotoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create member');
    }
  };

  const handleUpdatePhoto = async () => {
    if (!updatePhotoData) {
      setError('Please select a photo');
      return;
    }

    setError('');
    try {
      await updateMemberPhoto.mutateAsync(updatePhotoData);
      setIsUpdatePhotoDialogOpen(false);
      setUpdatePhotoData(null);
      setUpdatePhotoPreview(null);
      if (updatePhotoInputRef.current) {
        updatePhotoInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update photo');
    }
  };

  const handleDeleteMember = async (memberPrincipalStr: string) => {
    try {
      const memberPrincipal = Principal.fromText(memberPrincipalStr);
      await deleteMember.mutateAsync(memberPrincipal);
      toast.success('Member deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete member');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Management
          </CardTitle>
          <CardDescription>Manage administrators and member accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to access admin management.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (adminCheckLoading || scoreAuthCheckLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Management
          </CardTitle>
          <CardDescription>Manage administrators and member accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasAdminAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Management
          </CardTitle>
          <CardDescription>Manage administrators and member accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to access this page. Only admins and score-authentication admins can manage member accounts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const eligibleMembers = (members || []).filter(
    member => {
      if (!member.isClaimed) return false;
      return true;
    }
  );

  const claimedMembers = (members || []).filter(m => m.isClaimed);
  const unclaimedMembers = claimMembers || [];

  const claimedMembersWithPrincipal = (leaderboard || []).map(member => ({
    principal: member.id.toString(),
    name: member.name,
    photo: member.photo,
    rating: member.rating,
    rank: member.rank,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="members" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="members">Member Creation</TabsTrigger>
          <TabsTrigger value="claimStatus">Claim Status</TabsTrigger>
          <TabsTrigger value="deleteMember">Delete Member</TabsTrigger>
          <TabsTrigger value="bannerManager">Banner Management</TabsTrigger>
          {isAdmin && <TabsTrigger value="admins">Score Auth Admins</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    Create Member with Claim Code
                  </CardTitle>
                  <CardDescription>
                    Create new member profiles and generate one-time claim codes
                  </CardDescription>
                </div>
                <Dialog open={isCreateMemberDialogOpen} onOpenChange={setIsCreateMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Create Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Member</DialogTitle>
                      <DialogDescription>
                        Create a member profile and generate a unique claim code. Share the code with the member so they can link their Internet Identity.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="memberName">Member Name</Label>
                        <Input
                          id="memberName"
                          placeholder="Enter member's full name"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="memberPhoto">Member Photo (Optional)</Label>
                        <div className="flex items-center gap-4">
                          {newMemberPhotoPreview ? (
                            <div className="relative">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={newMemberPhotoPreview} alt="Preview" />
                                <AvatarFallback>
                                  <Camera className="h-8 w-8 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={clearPhoto}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/25">
                              <AvatarFallback>
                                <Camera className="h-8 w-8 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="flex-1">
                            <Input
                              ref={fileInputRef}
                              id="memberPhoto"
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Upload a photo for the member profile
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateMemberDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateMember}
                        disabled={!newMemberName.trim() || createClaimMember.isPending}
                      >
                        {createClaimMember.isPending ? 'Creating...' : 'Create Member'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {claimMembersLoading ? (
                  <p className="text-muted-foreground">Loading unclaimed members...</p>
                ) : unclaimedMembers.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No unclaimed member accounts. Create a new member to generate a claim code.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      Unclaimed Accounts ({unclaimedMembers.length})
                    </h3>
                    {unclaimedMembers.map(([code, member]) => (
                      <div
                        key={code}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={getMemberImage(member.photo)} alt={member.name} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Initial Elo: {Number(member.eloRating)}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {code}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCode(code)}
                                className="h-6 px-2"
                              >
                                {copiedCode === code ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">Unclaimed</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How Claim Codes Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Claim codes</strong> allow you to pre-create member profiles before users have logged in.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Create a member profile with their name and optional photo</li>
                <li>A unique one-time claim code is automatically generated</li>
                <li>Share the claim code with the member</li>
                <li>The member logs in with Internet Identity and enters the code</li>
                <li>Their identity is linked to the profile, and the code is deleted</li>
                <li>Each code can only be used once</li>
              </ul>
              <p className="pt-2">
                <strong className="text-foreground">Tip:</strong> Copy the claim code and send it to the member via email or message.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claimStatus" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Member Claim Status
              </CardTitle>
              <CardDescription>
                View which members have claimed their accounts versus those still pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <h3 className="font-semibold text-sm">
                      Claimed Members ({claimedMembers.length})
                    </h3>
                  </div>
                  {claimedMembers.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No members have claimed their accounts yet.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {claimedMembers.map((member, index) => (
                        <div
                          key={`claimed-${index}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={getMemberImage(member.photo)} alt={member.name} />
                              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Elo: {Number(member.rating)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-600">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Claimed
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-orange-600" />
                    <h3 className="font-semibold text-sm">
                      Unclaimed Members ({unclaimedMembers.length})
                    </h3>
                  </div>
                  {unclaimedMembers.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        All member accounts have been claimed.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {unclaimedMembers.map(([code, member]) => (
                        <div
                          key={code}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={getMemberImage(member.photo)} alt={member.name} />
                              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Initial Elo: {Number(member.eloRating)}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                  {code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyCode(code)}
                                  className="h-5 px-1"
                                >
                                  {copiedCode === code ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Unclaimed
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Update Your Photo</CardTitle>
              <CardDescription>
                Claimed members can update their own profile photo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isUpdatePhotoDialogOpen} onOpenChange={setIsUpdatePhotoDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Update My Photo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Your Photo</DialogTitle>
                    <DialogDescription>
                      Upload a new photo for your profile
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="updatePhoto">New Photo</Label>
                      <div className="flex items-center gap-4">
                        {updatePhotoPreview ? (
                          <div className="relative">
                            <Avatar className="h-20 w-20">
                              <AvatarImage src={updatePhotoPreview} alt="Preview" />
                              <AvatarFallback>
                                <Camera className="h-8 w-8 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={clearUpdatePhoto}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/25">
                            <AvatarFallback>
                              <Camera className="h-8 w-8 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1">
                          <Input
                            ref={updatePhotoInputRef}
                            id="updatePhoto"
                            type="file"
                            accept="image/*"
                            onChange={handleUpdatePhotoUpload}
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Upload a new photo
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUpdatePhotoDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdatePhoto}
                      disabled={updateMemberPhoto.isPending || !updatePhotoData}
                    >
                      {updateMemberPhoto.isPending ? 'Updating...' : 'Update Photo'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deleteMember" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete Member
              </CardTitle>
              <CardDescription>
                Permanently remove members from the system. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Deleting a member is permanent and cannot be undone. The member will be completely removed from the system.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  All Members ({claimedMembersWithPrincipal.length})
                </h3>
                {claimedMembersWithPrincipal.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No members available to delete.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {claimedMembersWithPrincipal.map((member) => (
                      <div
                        key={member.principal}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={getMemberImage(member.photo)} alt={member.name} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Rank: #{Number(member.rank)} • Elo: {Number(member.rating)}
                            </p>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex items-center gap-2"
                              disabled={deleteMember.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{member.name}</strong> from the system.
                                This action cannot be undone. The member will be removed from all leaderboards,
                                rankings, and the member directory.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteMember(member.principal)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Member
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Member Deletion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Member deletion</strong> is a permanent action that removes a member from the system.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>The member will be completely removed from the members database</li>
                <li>They will no longer appear in the member directory or leaderboards</li>
                <li>This action does not affect match history, schedules, or photos</li>
                <li>Only main admins and score-authentication admins can delete members</li>
                <li>Deleted members cannot be recovered - they must be re-created with a new claim code</li>
              </ul>
              <p className="pt-2">
                <strong className="text-foreground">Note:</strong> Use this feature carefully. Always confirm with the member before deletion.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bannerManager" className="space-y-6">
          <AdminBannerManager />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admins" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Score-Authentication Admins
                    </CardTitle>
                    <CardDescription>
                      Appoint or remove score-authentication administrators who can approve pending matches and create members
                    </CardDescription>
                  </div>
                  <Dialog open={isAppointDialogOpen} onOpenChange={setIsAppointDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Appoint Admin
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Appoint Score-Authentication Admin</DialogTitle>
                        <DialogDescription>
                          Select a member to grant score-authentication admin privileges. They will be able to approve or reject any pending match and create new member accounts.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="member">Select Member</Label>
                          <Select value={selectedMember} onValueChange={setSelectedMember}>
                            <SelectTrigger id="member">
                              <SelectValue placeholder="Choose a member..." />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleMembers.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">
                                  No eligible members available
                                </div>
                              ) : (
                                eligibleMembers.map((member, index) => (
                                  <SelectItem key={`member-${index}`} value={`member-${index}`}>
                                    {member.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAppointDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAppointAdmin}
                          disabled={!selectedMember || appointAdmin.isPending}
                        >
                          {appointAdmin.isPending ? 'Appointing...' : 'Appoint Admin'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminsLoading ? (
                    <p className="text-muted-foreground">Loading admins...</p>
                  ) : !scoreAuthAdmins || scoreAuthAdmins.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No score-authentication admins appointed yet. Appoint members to help manage pending matches and create member accounts.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {scoreAuthAdmins.map((adminPrincipal, index) => {
                        const adminName = getMemberName(adminPrincipal.toString());
                        return (
                          <div
                            key={`admin-${index}`}
                            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{getInitials(adminName)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{adminName}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {adminPrincipal.toString().substring(0, 20)}...
                                </p>
                              </div>
                              <Badge variant="secondary">Score Auth Admin</Badge>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveAdmin(adminPrincipal.toString())}
                              disabled={removeAdmin.isPending}
                              className="flex items-center gap-2"
                            >
                              <UserMinus className="h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About Score-Authentication Admins</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Score-authentication admins</strong> are trusted members who can help manage the match approval workflow and member onboarding.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>They can approve or reject any pending match submission</li>
                  <li>They can create new member accounts with claim codes</li>
                  <li>They can manage weekly schedule sessions</li>
                  <li>This helps when opponents are unavailable to approve matches</li>
                  <li>Only the main admin can appoint or remove score-authentication admins</li>
                </ul>
                <p className="pt-2">
                  <strong className="text-foreground">Note:</strong> Approved matches will update both players' Elo ratings automatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

