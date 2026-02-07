import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface PhotoWithUploader {
    uploaderName: string;
    blob: ExternalBlob;
    uploader: Principal;
}
export interface SessionInput {
    sessionType: string;
    date: Time;
    notes: string;
}
export type Photo = Uint8Array;
export type Time = bigint;
export interface RegisteredPlayer {
    id: Principal;
    name: string;
    rating: bigint;
    photo?: Photo;
}
export interface BannerPhoto {
    uploaderName: string;
    photoKey: string;
    uploadTimestamp: Time;
    uploader: Principal;
}
export interface TournamentMatchScore {
    status: MatchStatus;
    scoreA: bigint;
    scoreB: bigint;
    rejectionReason?: string;
    tableNumber: bigint;
    playerA: Principal;
    playerB: Principal;
    timestamp: Time;
    roundNumber: bigint;
}
export interface TournamentRound {
    matches: Array<TournamentMatchScore>;
    roundNumber: bigint;
    isComplete: boolean;
}
export interface MemberProfile {
    id: Principal;
    name: string;
    rating: EloRating;
    photo?: Photo;
    matchHistory: Array<MatchScore>;
}
export interface TournamentState {
    status: TournamentStatus;
    registeredPlayers: Array<RegisteredPlayer>;
    currentRound: bigint;
    playerStats: Array<TournamentPlayerStats>;
    endTimestamp?: Time;
    startTimestamp?: Time;
    rounds: Array<TournamentRound>;
}
export interface PublicMemberDirectoryEntry {
    name: string;
    rank: bigint;
    isClaimed: boolean;
    rating: bigint;
    photo?: Photo;
}
export interface TournamentLeaderboardEntry {
    gamesLost: bigint;
    player: Principal;
    rank: bigint;
    wins: bigint;
    losses: bigint;
    playerName: string;
    playerPhoto?: Photo;
    gamesWon: bigint;
    points: bigint;
}
export interface WeeklySession {
    sessionType: string;
    date: Time;
    notes: string;
}
export interface MatchScore {
    status: MatchStatus;
    scoreA: bigint;
    scoreB: bigint;
    rejectionReason?: string;
    kFactor: bigint;
    ratingChangeA: bigint;
    ratingChangeB: bigint;
    playerA: Principal;
    playerB: Principal;
    timestamp: Time;
}
export interface TournamentPlayerStats {
    gamesLost: bigint;
    player: Principal;
    wins: bigint;
    losses: bigint;
    gamesWon: bigint;
    points: bigint;
}
export interface OneTimeClaimMember {
    name: string;
    eloRating: bigint;
    createdTimestamp: Time;
    photo?: Photo;
}
export interface MemberProfileWithRank {
    id: Principal;
    name: string;
    rank: bigint;
    rating: EloRating;
    photo?: Photo;
    matchHistory: Array<MatchScore>;
}
export type EloRating = bigint;
export interface CategoryLeaderboard {
    categoryName: string;
    players: Array<MemberProfileWithRank>;
}
export interface UserProfile {
    name: string;
    photo?: Photo;
}
export enum MatchStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum TournamentStatus {
    notStarted = "notStarted",
    active = "active",
    completed = "completed",
    announced = "announced",
    paused = "paused"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addPhotoToBanner(photoKey: string): Promise<void>;
    addPlayerToTournament(player: Principal): Promise<void>;
    announceTournament(): Promise<void>;
    appointScoreAuthAdmin(user: Principal): Promise<void>;
    approveMatch(matchTimestamp: Time): Promise<void>;
    approveTournamentMatch(roundNumber: bigint, matchIndex: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimMemberAccount(claimCode: string): Promise<void>;
    createMemberWithClaimCode(name: string, photo: Photo | null): Promise<string>;
    createSession(input: SessionInput): Promise<void>;
    deleteBannerPhoto(photoKey: string): Promise<void>;
    deleteMember(memberPrincipal: Principal): Promise<void>;
    deletePhoto(photoKey: string): Promise<void>;
    deleteSession(date: Time): Promise<void>;
    endTournament(): Promise<void>;
    getAllBannerPhotoKeys(): Promise<Array<string>>;
    getApprovedMatches(): Promise<Array<MatchScore>>;
    getBannerPhotoCount(): Promise<bigint>;
    getBannerPhotos(): Promise<Array<string>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCategoryLeaderboards(): Promise<Array<CategoryLeaderboard>>;
    getLeaderboard(): Promise<Array<MemberProfileWithRank>>;
    getMemberDirectory(): Promise<Array<PublicMemberDirectoryEntry>>;
    getMemberProfile(user: Principal): Promise<MemberProfile | null>;
    getPendingMatches(): Promise<Array<MatchScore>>;
    getPhoto(photoKey: string): Promise<PhotoWithUploader | null>;
    getPhotos(): Promise<Array<[string, PhotoWithUploader]>>;
    getPlayerMatchHistory(player: Principal): Promise<Array<MatchScore>>;
    getRegisteredPlayerDetails(): Promise<Array<RegisteredPlayer>>;
    getSchedule(): Promise<Array<WeeklySession>>;
    getScoreAuthAdmins(): Promise<Array<Principal>>;
    getTournamentLeaderboard(): Promise<Array<TournamentLeaderboardEntry>>;
    getTournamentState(): Promise<TournamentState>;
    getUnclaimedMembers(): Promise<Array<[string, OneTimeClaimMember]>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    importMemberData(memberData: Array<[Principal, MemberProfile]>): Promise<void>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isScoreAuthAdmin(user: Principal): Promise<boolean>;
    isTournamentActive(): Promise<boolean>;
    pauseTournament(): Promise<void>;
    registerForTournament(): Promise<void>;
    rejectMatch(matchTimestamp: Time, reason: string | null): Promise<void>;
    rejectTournamentMatch(roundNumber: bigint, matchIndex: bigint, reason: string | null): Promise<void>;
    removePhotoFromBanner(photoKey: string): Promise<void>;
    removePlayerFromTournament(player: Principal): Promise<void>;
    removeScoreAuthAdmin(user: Principal): Promise<void>;
    reorderBannerPhotos(newOrder: Array<string>): Promise<void>;
    resetTournament(): Promise<void>;
    restoreDataFromLegacy(legacyData: Array<[string, BannerPhoto]>, legacyBannerList: Array<string>): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startTournament(): Promise<void>;
    submitMatchScore(opponent: Principal, scoreA: bigint, scoreB: bigint): Promise<void>;
    submitMatchScoreWithPlayers(player1: Principal, player2: Principal, scoreA: bigint, scoreB: bigint): Promise<void>;
    submitTournamentMatchScore(opponent: Principal, scoreA: bigint, scoreB: bigint, roundNumber: bigint, tableNumber: bigint): Promise<void>;
    submitTournamentMatchScoreWithPlayers(player1: Principal, player2: Principal, scoreA: bigint, scoreB: bigint, roundNumber: bigint, tableNumber: bigint): Promise<void>;
    unregisterFromTournament(): Promise<void>;
    updateMemberPhoto(photo: Photo): Promise<void>;
    updateSession(date: Time, input: SessionInput): Promise<void>;
    uploadBannerPhoto(photoKey: string, uploaderName: string): Promise<void>;
    uploadPhoto(photoKey: string, photoBlob: ExternalBlob, uploaderName: string): Promise<void>;
}
