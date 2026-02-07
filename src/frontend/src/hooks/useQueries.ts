import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { MemberProfile, MemberProfileWithRank, WeeklySession, SessionInput, UserProfile, MatchScore, PhotoWithUploader, CategoryLeaderboard, OneTimeClaimMember, PublicMemberDirectoryEntry, TournamentState, TournamentLeaderboardEntry, RegisteredPlayer } from '../backend';
import { MatchStatus, ExternalBlob } from '../backend';
import { Principal } from '@icp-sdk/core/principal';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetMemberDirectory() {
  const { actor, isFetching } = useActor();

  return useQuery<PublicMemberDirectoryEntry[]>({
    queryKey: ['memberDirectory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMemberDirectory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSchedule() {
  const { actor, isFetching } = useActor();

  return useQuery<WeeklySession[]>({
    queryKey: ['schedule'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSchedule();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: SessionInput) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createSession(session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useUpdateSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, session }: { date: bigint; session: SessionInput }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateSession(date, session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useDeleteSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteSession(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export function useSubmitMatchScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opponent, scoreA, scoreB }: { opponent: string; scoreA: bigint; scoreB: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      const opponentPrincipal = Principal.fromText(opponent);
      return actor.submitMatchScore(opponentPrincipal, scoreA, scoreB);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberDirectory'] });
      queryClient.invalidateQueries({ queryKey: ['pendingMatches'] });
      queryClient.invalidateQueries({ queryKey: ['approvedMatches'] });
    },
  });
}

export function useGetPendingMatches() {
  const { actor, isFetching } = useActor();

  return useQuery<MatchScore[]>({
    queryKey: ['pendingMatches'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingMatches();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useApproveMatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timestamp: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveMatch(timestamp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingMatches'] });
      queryClient.invalidateQueries({ queryKey: ['approvedMatches'] });
      queryClient.invalidateQueries({ queryKey: ['memberDirectory'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['categoryLeaderboards'] });
      queryClient.invalidateQueries({ queryKey: ['playerMatchHistory'] });
    },
  });
}

export function useRejectMatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timestamp, reason }: { timestamp: bigint; reason: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.rejectMatch(timestamp, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingMatches'] });
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPhotos() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, PhotoWithUploader]>>({
    queryKey: ['photos'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPhotos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blob, uploaderName }: { blob: ExternalBlob; uploaderName: string }) => {
      if (!actor) throw new Error('Actor not available');
      const photoKey = `photo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await actor.uploadPhoto(photoKey, blob, uploaderName);
      return photoKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useDeletePhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoKey: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deletePhoto(photoKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['bannerPhotos'] });
    },
  });
}

export function useGetLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<MemberProfileWithRank[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCategoryLeaderboards() {
  const { actor, isFetching } = useActor();

  return useQuery<CategoryLeaderboard[]>({
    queryKey: ['categoryLeaderboards'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCategoryLeaderboards();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetScoreAuthAdmins() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['scoreAuthAdmins'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getScoreAuthAdmins();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAppointScoreAuthAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.appointScoreAuthAdmin(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoreAuthAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['isScoreAuthAdmin'] });
    },
  });
}

export function useRemoveScoreAuthAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeScoreAuthAdmin(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoreAuthAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['isScoreAuthAdmin'] });
    },
  });
}

export function useIsScoreAuthAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isScoreAuthAdmin', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return false;
      return actor.isScoreAuthAdmin(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useCreateMemberWithClaimCode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, photo }: { name: string; photo: Uint8Array | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createMemberWithClaimCode(name, photo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unclaimedMembers'] });
      queryClient.invalidateQueries({ queryKey: ['memberDirectory'] });
    },
  });
}

export function useGetUnclaimedMembers() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, OneTimeClaimMember]>>({
    queryKey: ['unclaimedMembers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUnclaimedMembers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useClaimMemberAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimCode: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.claimMemberAccount(claimCode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberDirectory'] });
      queryClient.invalidateQueries({ queryKey: ['unclaimedMembers'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['categoryLeaderboards'] });
    },
  });
}

export function useUpdateMemberPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: Uint8Array) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateMemberPhoto(photo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberDirectory'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['categoryLeaderboards'] });
      queryClient.invalidateQueries({ queryKey: ['scoreAuthAdmins'] });
    },
  });
}

export function useDeleteMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMember(memberPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberDirectory'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['categoryLeaderboards'] });
      queryClient.invalidateQueries({ queryKey: ['scoreAuthAdmins'] });
    },
  });
}

export function useGetPlayerMatchHistory(principal: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['playerMatchHistory', principal.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPlayerMatchHistory(principal);
    },
    enabled: !!actor && !isFetching && principal.toString() !== Principal.anonymous().toString(),
  });
}

export function useGetApprovedMatches() {
  const { actor, isFetching } = useActor();

  return useQuery<MatchScore[]>({
    queryKey: ['approvedMatches'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getApprovedMatches();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetBannerPhotos() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['bannerPhotos'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBannerPhotos();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useGetAllBannerPhotoKeys() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['allBannerPhotoKeys'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBannerPhotoKeys();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useGetBannerPhotoCount() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['bannerPhotoCount'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getBannerPhotoCount();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useUploadBannerPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blob, uploaderName }: { blob: ExternalBlob; uploaderName: string }) => {
      if (!actor) throw new Error('Actor not available');
      const photoKey = `banner-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      await actor.uploadPhoto(photoKey, blob, uploaderName);
      await actor.uploadBannerPhoto(photoKey, uploaderName);
      
      return photoKey;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['photos'] });
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotos'] });
      await queryClient.invalidateQueries({ queryKey: ['allBannerPhotoKeys'] });
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotoCount'] });
      await queryClient.refetchQueries({ queryKey: ['bannerPhotoCount'] });
    },
  });
}

export function useDeleteBannerPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoKey: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteBannerPhoto(photoKey);
      await actor.deletePhoto(photoKey);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['photos'] });
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotos'] });
      await queryClient.invalidateQueries({ queryKey: ['allBannerPhotoKeys'] });
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotoCount'] });
      await queryClient.refetchQueries({ queryKey: ['bannerPhotoCount'] });
      await queryClient.refetchQueries({ queryKey: ['bannerPhotos'] });
      await queryClient.refetchQueries({ queryKey: ['allBannerPhotoKeys'] });
      await queryClient.refetchQueries({ queryKey: ['photos'] });
    },
  });
}

export function useAddPhotoToBanner() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoKey: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addPhotoToBanner(photoKey);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotos'] });
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotoCount'] });
      await queryClient.refetchQueries({ queryKey: ['bannerPhotoCount'] });
    },
  });
}

export function useRemovePhotoFromBanner() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoKey: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.removePhotoFromBanner(photoKey);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotos'] });
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotoCount'] });
      await queryClient.refetchQueries({ queryKey: ['bannerPhotoCount'] });
    },
  });
}

export function useReorderBannerPhotos() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.reorderBannerPhotos(newOrder);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bannerPhotos'] });
    },
  });
}

export function useIsTournamentActive() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isTournamentActive'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isTournamentActive();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTournamentState() {
  const { actor, isFetching } = useActor();

  return useQuery<TournamentState>({
    queryKey: ['tournamentState'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getTournamentState();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useGetTournamentLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<TournamentLeaderboardEntry[]>({
    queryKey: ['tournamentLeaderboard'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTournamentLeaderboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRegisteredPlayerDetails(hasAdminAccess: boolean) {
  const { actor, isFetching } = useActor();

  return useQuery<RegisteredPlayer[]>({
    queryKey: ['registeredPlayerDetails'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getRegisteredPlayerDetails();
      } catch (error) {
        console.error('Error fetching registered player details:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching && hasAdminAccess,
    refetchInterval: hasAdminAccess ? 3000 : false,
    retry: false,
  });
}

export function useAnnounceTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.announceTournament();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.invalidateQueries({ queryKey: ['isTournamentActive'] });
      await queryClient.invalidateQueries({ queryKey: ['registeredPlayerDetails'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
    },
  });
}

export function useStartTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.startTournament();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.invalidateQueries({ queryKey: ['isTournamentActive'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
    },
  });
}

export function usePauseTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.pauseTournament();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.invalidateQueries({ queryKey: ['isTournamentActive'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
    },
  });
}

export function useEndTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.endTournament();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.invalidateQueries({ queryKey: ['isTournamentActive'] });
      await queryClient.invalidateQueries({ queryKey: ['tournamentLeaderboard'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
    },
  });
}

export function useResetTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.resetTournament();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.invalidateQueries({ queryKey: ['isTournamentActive'] });
      await queryClient.invalidateQueries({ queryKey: ['tournamentLeaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['registeredPlayerDetails'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
    },
  });
}

export function useRegisterForTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.registerForTournament();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.invalidateQueries({ queryKey: ['registeredPlayerDetails'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
      await queryClient.refetchQueries({ queryKey: ['registeredPlayerDetails'] });
    },
  });
}

export function useUnregisterFromTournament() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.unregisterFromTournament();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.invalidateQueries({ queryKey: ['registeredPlayerDetails'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
      await queryClient.refetchQueries({ queryKey: ['registeredPlayerDetails'] });
    },
  });
}

export function useSubmitTournamentMatchScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      opponent,
      scoreA,
      scoreB,
      roundNumber,
      tableNumber,
    }: {
      opponent: Principal;
      scoreA: bigint;
      scoreB: bigint;
      roundNumber: bigint;
      tableNumber: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.submitTournamentMatchScore(opponent, scoreA, scoreB, roundNumber, tableNumber);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
    },
  });
}

export function useSubmitTournamentMatchScoreWithPlayers() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      player1,
      player2,
      scoreA,
      scoreB,
      roundNumber,
      tableNumber,
    }: {
      player1: Principal;
      player2: Principal;
      scoreA: bigint;
      scoreB: bigint;
      roundNumber: bigint;
      tableNumber: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.submitTournamentMatchScoreWithPlayers(player1, player2, scoreA, scoreB, roundNumber, tableNumber);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
    },
  });
}

export function useApproveTournamentMatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundNumber,
      matchIndex,
    }: {
      roundNumber: bigint;
      matchIndex: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.approveTournamentMatch(roundNumber, matchIndex);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.invalidateQueries({ queryKey: ['tournamentLeaderboard'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentLeaderboard'] });
    },
  });
}

export function useRejectTournamentMatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roundNumber,
      matchIndex,
      reason,
    }: {
      roundNumber: bigint;
      matchIndex: bigint;
      reason: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.rejectTournamentMatch(roundNumber, matchIndex, reason);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tournamentState'] });
      await queryClient.refetchQueries({ queryKey: ['tournamentState'] });
    },
  });
}
