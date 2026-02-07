import Array "mo:core/Array";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";

actor {
  include MixinStorage();

  let bannerPhotosList : List.List<Text> = List.empty<Text>();

  public type Photo = Storage.ExternalBlob;

  type ClaimedStatus = { #claimed : Principal; #unclaimed : Text };

  type MemberDirectoryEntry = {
    name : Text;
    photo : ?Photo;
    isClaimed : Bool;
    claimedStatus : ClaimedStatus;
    rating : Nat;
  };

  type PublicMemberDirectoryEntry = {
    name : Text;
    photo : ?Photo;
    isClaimed : Bool;
    rating : Nat;
    rank : Nat;
  };

  type RegisteredPlayer = {
    id : Principal;
    name : Text;
    photo : ?Photo;
    rating : Nat;
  };

  type PhotoWithUploader = {
    blob : Storage.ExternalBlob;
    uploader : Principal;
    uploaderName : Text;
  };

  type BannerPhoto = {
    photoKey : Text;
    uploader : Principal;
    uploaderName : Text;
    uploadTimestamp : Time.Time;
  };

  type EloRating = Nat;

  type MatchStatus = { #pending; #approved; #rejected };

  type MatchScore = {
    playerA : Principal;
    playerB : Principal;
    scoreA : Nat;
    scoreB : Nat;
    timestamp : Time.Time;
    ratingChangeA : Int;
    ratingChangeB : Int;
    status : MatchStatus;
    rejectionReason : ?Text;
    kFactor : Nat;
  };

  type MemberProfile = {
    id : Principal;
    name : Text;
    photo : ?Photo;
    rating : EloRating;
    matchHistory : [MatchScore];
  };

  type MemberProfileWithRank = {
    id : Principal;
    name : Text;
    photo : ?Photo;
    rating : EloRating;
    matchHistory : [MatchScore];
    rank : Nat;
  };

  type OneTimeClaimMember = {
    name : Text;
    photo : ?Photo;
    createdTimestamp : Time.Time;
    eloRating : Nat;
  };

  type WeeklySession = {
    date : Time.Time;
    sessionType : Text;
    notes : Text;
  };

  type SessionInput = {
    date : Time.Time;
    sessionType : Text;
    notes : Text;
  };

  type CategoryLeaderboard = {
    categoryName : Text;
    players : [MemberProfileWithRank];
  };

  type TournamentStatus = {
    #notStarted;
    #active;
    #announced;
    #paused;
    #completed;
  };

  type TournamentMatchScore = {
    playerA : Principal;
    playerB : Principal;
    scoreA : Nat;
    scoreB : Nat;
    timestamp : Time.Time;
    status : MatchStatus;
    rejectionReason : ?Text;
    roundNumber : Nat;
    tableNumber : Nat;
  };

  type TournamentRound = {
    roundNumber : Nat;
    matches : [TournamentMatchScore];
    isComplete : Bool;
  };

  type TournamentPlayerStats = {
    player : Principal;
    wins : Nat;
    losses : Nat;
    points : Nat;
    gamesWon : Nat;
    gamesLost : Nat;
  };

  type TournamentState = {
    status : TournamentStatus;
    registeredPlayers : [RegisteredPlayer];
    currentRound : Nat;
    rounds : [TournamentRound];
    playerStats : [TournamentPlayerStats];
    startTimestamp : ?Time.Time;
    endTimestamp : ?Time.Time;
  };

  type TournamentLeaderboardEntry = {
    player : Principal;
    playerName : Text;
    playerPhoto : ?Photo;
    wins : Nat;
    losses : Nat;
    points : Nat;
    gamesWon : Nat;
    gamesLost : Nat;
    rank : Nat;
  };

  let members = Map.empty<Principal, MemberProfile>();
  let oneTimeClaimMembers = Map.empty<Text, OneTimeClaimMember>();
  let weeklySchedule = Map.empty<Time.Time, WeeklySession>();
  let matches = Map.empty<Time.Time, MatchScore>();
  let photos = Map.empty<Text, PhotoWithUploader>();
  let bannerPhotos = Map.empty<Text, BannerPhoto>();
  let scoreAuthAdmins = Map.empty<Principal, Bool>();

  var tournamentState : TournamentState = {
    status = #notStarted;
    registeredPlayers = [];
    currentRound = 0;
    rounds = [];
    playerStats = [];
    startTimestamp = null;
    endTimestamp = null;
  };

  var accessControlState = AccessControl.initState();

  func isScoreAuthAdminInternal(user : Principal) : Bool {
    switch (scoreAuthAdmins.get(user)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  func isAdminOrScoreAuthAdmin(user : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, user) or isScoreAuthAdminInternal(user);
  };

  func calculateKFactor(matchesPlayed : Nat) : Nat {
    if (matchesPlayed < 30) { 40 } else if (matchesPlayed < 100) { 20 } else { 10 };
  };

  func validateMatchScore(scoreA : Nat, scoreB : Nat) : Bool {
    if (scoreA == scoreB) { return false };
    if (scoreA > 3 or scoreB > 3) { return false };
    true;
  };

  func validateTournamentScore(scoreA : Nat, scoreB : Nat) : Bool {
    if ((scoreA == 2 and scoreB >= 0 and scoreB <= 1) or (scoreB == 2 and scoreA >= 0 and scoreA <= 1)) {
      return true;
    };
    false;
  };

  func getSortedMembersByRating() : [MemberProfile] {
    let allMembers = members.values().toArray();
    allMembers.sort(
      func(a : MemberProfile, b : MemberProfile) : Order.Order {
        Nat.compare(b.rating, a.rating);
      }
    );
  };

  public shared ({ caller }) func appointScoreAuthAdmin(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only main admin can appoint score-authentication admins");
    };
    scoreAuthAdmins.add(user, true);
  };

  public shared ({ caller }) func removeScoreAuthAdmin(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only main admin can remove score-authentication admins");
    };
    scoreAuthAdmins.remove(user);
  };

  public query ({ caller }) func getScoreAuthAdmins() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view score-authentication admin list");
    };
    scoreAuthAdmins.keys().toArray();
  };

  public query ({ caller }) func isScoreAuthAdmin(user : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check admin status");
    };
    isScoreAuthAdminInternal(user);
  };

  public shared ({ caller }) func createMemberWithClaimCode(name : Text, photo : ?Photo) : async Text {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can create members");
    };

    let claimCode = generateClaimCode();
    let newMember : OneTimeClaimMember = {
      name = name;
      photo = photo;
      createdTimestamp = Time.now();
      eloRating = 1500;
    };

    oneTimeClaimMembers.add(claimCode, newMember);
    claimCode;
  };

  public shared ({ caller }) func claimMemberAccount(claimCode : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can claim new accounts");
    };

    switch (oneTimeClaimMembers.get(claimCode)) {
      case (?claimMember) {
        let profile : MemberProfile = {
          id = caller;
          name = claimMember.name;
          photo = claimMember.photo;
          rating = claimMember.eloRating;
          matchHistory = [];
        };
        members.add(caller, profile);
        oneTimeClaimMembers.remove(claimCode);
      };
      case (null) { Runtime.trap("Invalid claim code") };
    };
  };

  public shared ({ caller }) func updateMemberPhoto(photo : Photo) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can update member photos");
    };

    switch (members.get(caller)) {
      case (?profile) {
        let updated = {
          profile with photo = ?photo;
        };
        members.add(caller, updated);
      };
      case (null) { Runtime.trap("Member profile not found") };
    };
  };

  public shared ({ caller }) func deleteMember(memberPrincipal : Principal) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only main admins and score-authentication admins can delete members");
    };

    switch (members.get(memberPrincipal)) {
      case (?_) {
        members.remove(memberPrincipal);
      };
      case (null) { Runtime.trap("Member not found") };
    };
  };

  public query func getMemberDirectory() : async [PublicMemberDirectoryEntry] {
    let sortedMembers = getSortedMembersByRating();

    let claimedWithRank = Array.tabulate(
      sortedMembers.size(),
      func(i) {
        let m = sortedMembers[i];
        {
          name = m.name;
          photo = m.photo;
          isClaimed = true;
          rating = m.rating;
          rank = i + 1;
        };
      }
    );

    let unclaimedMembers = oneTimeClaimMembers.values().map(
      func(m : OneTimeClaimMember) : PublicMemberDirectoryEntry {
        {
          name = m.name;
          photo = m.photo;
          isClaimed = false;
          rating = m.eloRating;
          rank = 0;
        };
      }
    );

    claimedWithRank.concat(unclaimedMembers.toArray());
  };

  public query ({ caller }) func getUnclaimedMembers() : async [(Text, OneTimeClaimMember)] {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can view unclaimed members");
    };
    oneTimeClaimMembers.entries().toArray();
  };

  public query ({ caller }) func getMemberProfile(user : Principal) : async ?MemberProfile {
    members.get(user);
  };

  public shared ({ caller }) func submitMatchScore(opponent : Principal, scoreA : Nat, scoreB : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can submit match scores");
    };

    if (not validateMatchScore(scoreA, scoreB)) {
      Runtime.trap("Invalid match score: Tied games not allowed");
    };

    let timestamp = Time.now();
    let matchRecord : MatchScore = {
      playerA = caller;
      playerB = opponent;
      scoreA = scoreA;
      scoreB = scoreB;
      timestamp = timestamp;
      ratingChangeA = 0;
      ratingChangeB = 0;
      status = #pending;
      rejectionReason = null;
      kFactor = 0;
    };

    matches.add(timestamp, matchRecord);
  };

  public shared ({ caller }) func submitMatchScoreWithPlayers(player1 : Principal, player2 : Principal, scoreA : Nat, scoreB : Nat) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can submit matches with explicit players");
    };

    if (player1 == player2) {
      Runtime.trap("Player 1 and Player 2 must be different");
    };

    if (not validateMatchScore(scoreA, scoreB)) {
      Runtime.trap("Invalid match score: Tied games not allowed");
    };

    let timestamp = Time.now();
    let matchRecord : MatchScore = {
      playerA = player1;
      playerB = player2;
      scoreA = scoreA;
      scoreB = scoreB;
      timestamp = timestamp;
      ratingChangeA = 0;
      ratingChangeB = 0;
      status = #pending;
      rejectionReason = null;
      kFactor = 0;
    };

    matches.add(timestamp, matchRecord);
  };

  public shared ({ caller }) func approveMatch(matchTimestamp : Time.Time) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can approve matches");
    };

    switch (matches.get(matchTimestamp)) {
      case (?match) {
        let canApprove = (caller == match.playerB) or isAdminOrScoreAuthAdmin(caller);

        if (not canApprove) {
          Runtime.trap("Unauthorized: Only the opponent or admins can approve this match");
        };

        let updatedMatch = { match with status = #approved };
        matches.add(matchTimestamp, updatedMatch);
        updateEloRatings(updatedMatch);
      };
      case (null) {
        Runtime.trap("Match not found");
      };
    };
  };

  public shared ({ caller }) func rejectMatch(matchTimestamp : Time.Time, reason : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can reject matches");
    };

    switch (matches.get(matchTimestamp)) {
      case (?match) {
        let canReject = (caller == match.playerB) or isAdminOrScoreAuthAdmin(caller);

        if (not canReject) {
          Runtime.trap("Unauthorized: Only the opponent or admins can reject this match");
        };

        let updatedMatch = {
          match with
          status = #rejected;
          rejectionReason = reason;
        };
        matches.add(matchTimestamp, updatedMatch);
      };
      case (null) {
        Runtime.trap("Match not found");
      };
    };
  };

  public query ({ caller }) func getPendingMatches() : async [MatchScore] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view pending matches");
    };

    matches.values().filter(func(m) { m.status == #pending }).toArray();
  };

  public query func getApprovedMatches() : async [MatchScore] {
    matches.values().filter(func(m) { m.status == #approved }).toArray();
  };

  public query ({ caller }) func getPlayerMatchHistory(player : Principal) : async [MatchScore] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view match history");
    };

    matches
      .values()
      .filter(func(m) { (m.playerA == player or m.playerB == player) and m.status == #approved })
      .toArray();
  };

  func updateEloRatings(match : MatchScore) {
    switch (members.get(match.playerA), members.get(match.playerB)) {
      case (?profileA, ?profileB) {
        let kFactorA = calculateKFactor(profileA.matchHistory.size());
        let kFactorB = calculateKFactor(profileB.matchHistory.size());

        let ratingA = profileA.rating;
        let ratingB = profileB.rating;

        let expectedA = 1.0 / (1.0 + 10.0 ** ((ratingB.toInt() - ratingA.toInt()).toFloat() / 400.0));
        let expectedB = 1.0 - expectedA;

        let actualA = if (match.scoreA > match.scoreB) { 1.0 } else { 0.0 };
        let actualB = 1.0 - actualA;

        let changeA = (kFactorA.toFloat() * (actualA - expectedA)).toInt();
        let changeB = (kFactorB.toFloat() * (actualB - expectedB)).toInt();

        let newRatingA = Int.max(0, ratingA + changeA);
        let newRatingB = Int.max(0, ratingB + changeB);

        let updatedMatch = {
          match with
          ratingChangeA = changeA;
          ratingChangeB = changeB;
          kFactor = kFactorA;
        };

        matches.add(match.timestamp, updatedMatch);

        let updatedProfileA = {
          profileA with
          rating = Int.abs(newRatingA);
          matchHistory = profileA.matchHistory.concat([updatedMatch]);
        };

        let updatedProfileB = {
          profileB with
          rating = Int.abs(newRatingB);
          matchHistory = profileB.matchHistory.concat([updatedMatch]);
        };

        members.add(match.playerA, updatedProfileA);
        members.add(match.playerB, updatedProfileB);
      };
      case (_, _) {};
    };
  };

  public shared ({ caller }) func createSession(input : SessionInput) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-auth-admin can create sessions");
    };

    let session : WeeklySession = {
      date = input.date;
      sessionType = input.sessionType;
      notes = input.notes;
    };

    weeklySchedule.add(input.date, session);
  };

  public shared ({ caller }) func updateSession(date : Time.Time, input : SessionInput) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can update sessions");
    };

    let session : WeeklySession = {
      date = input.date;
      sessionType = input.sessionType;
      notes = input.notes;
    };

    weeklySchedule.add(date, session);
  };

  public shared ({ caller }) func deleteSession(date : Time.Time) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can delete sessions");
    };

    weeklySchedule.remove(date);
  };

  public query func getSchedule() : async [WeeklySession] {
    weeklySchedule.values().toArray();
  };

  public shared ({ caller }) func uploadPhoto(photoKey : Text, photoBlob : Storage.ExternalBlob, uploaderName : Text) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-auth admins can upload photos");
    };

    let photoWithUploader : PhotoWithUploader = {
      blob = photoBlob;
      uploader = caller;
      uploaderName = uploaderName;
    };

    photos.add(photoKey, photoWithUploader);
  };

  public shared ({ caller }) func deletePhoto(photoKey : Text) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-auth admins can delete photos");
    };

    photos.remove(photoKey);
  };

  public query func getPhotos() : async [(Text, PhotoWithUploader)] {
    photos.entries().toArray();
  };

  public query func getPhoto(photoKey : Text) : async ?PhotoWithUploader {
    photos.get(photoKey);
  };

  public shared ({ caller }) func uploadBannerPhoto(photoKey : Text, uploaderName : Text) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-auth admins can upload banner photos");
    };

    if (bannerPhotosList.size() >= 20) {
      Runtime.trap("Cannot upload more banner photos. Maximum of 20 reached!");
    };

    let newBannerPhoto : BannerPhoto = {
      photoKey = photoKey;
      uploader = caller;
      uploaderName = uploaderName;
      uploadTimestamp = Time.now();
    };

    bannerPhotos.add(photoKey, newBannerPhoto);

    if (bannerPhotosList.size() < 20) {
      switch (bannerPhotosList.find(func(key) { key == photoKey })) {
        case (null) {
          bannerPhotosList.add(photoKey);
        };
        case (?_) {};
      };
    };
  };

  public shared ({ caller }) func deleteBannerPhoto(photoKey : Text) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-auth admins can delete banner photos");
    };

    bannerPhotos.remove(photoKey);

    if (bannerPhotosList.isEmpty()) {
      return;
    };

    if (bannerPhotosList.size() == 1) {
      let existing = bannerPhotosList.first();
      let isSame = switch (existing) {
        case (null) { false };
        case (?existingKey) { existingKey == photoKey };
      };
      if (isSame) {
        bannerPhotosList.clear();
      };
      return;
    };

    let filteredBanner = bannerPhotosList.filter(func(key) { key != photoKey });
    bannerPhotosList.clear();
    filteredBanner.forEach(func(key) { bannerPhotosList.add(key) });
  };

  public shared ({ caller }) func addPhotoToBanner(photoKey : Text) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can add photos to the banner");
    };

    if (bannerPhotosList.size() >= 20) {
      Runtime.trap("Cannot add more photos. Maximum of 20 reached!");
    };

    let duplicate = bannerPhotosList.find(func(existing) { existing == photoKey }).isSome();

    if (duplicate) {
      Runtime.trap("Photo is already in the banner!");
    };

    switch (bannerPhotos.get(photoKey)) {
      case (?_) {
        bannerPhotosList.add(photoKey);
      };
      case (null) { Runtime.trap("Photo does not exist in banner uploads") };
    };
  };

  public shared ({ caller }) func removePhotoFromBanner(photoKey : Text) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can remove photos from the banner");
    };

    let filteredList = bannerPhotosList.filter(func(entry) { entry != photoKey });

    if (filteredList.size() == bannerPhotosList.size()) {
      Runtime.trap("Photo not found in banner");
    };

    bannerPhotosList.clear();
    filteredList.forEach(func(key) { bannerPhotosList.add(key) });
  };

  public shared ({ caller }) func reorderBannerPhotos(newOrder : [Text]) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can reorder banner photos");
    };

    if (newOrder.size() > 20) {
      Runtime.trap("Cannot reorder more than 20 photos");
    };

    let newOrderList = List.fromArray(newOrder);

    bannerPhotosList.clear();
    newOrderList.forEach(func(key) { bannerPhotosList.add(key) });
  };

  public query func getBannerPhotos() : async [Text] {
    bannerPhotosList.toArray();
  };

  public query func getBannerPhotoCount() : async Nat {
    bannerPhotosList.size();
  };

  public query func getAllBannerPhotoKeys() : async [Text] {
    bannerPhotos.keys().toArray();
  };

  public query func getLeaderboard() : async [MemberProfileWithRank] {
    let sortedMembers = getSortedMembersByRating();

    Array.tabulate(
      sortedMembers.size(),
      func(i) {
        let m = sortedMembers[i];
        {
          id = m.id;
          name = m.name;
          photo = m.photo;
          rating = m.rating;
          matchHistory = m.matchHistory;
          rank = i + 1;
        };
      }
    );
  };

  public query func getCategoryLeaderboards() : async [CategoryLeaderboard] {
    let sortedMembers = getSortedMembersByRating();
    let totalPlayers = sortedMembers.size();

    if (totalPlayers == 0) {
      return [];
    };

    let categoryNames = [
      "Expert Pros",
      "Expert Elites",
      "Expert Club",
      "Casuals Club",
      "Casuals Newbie",
      "Beginners Club",
      "Beginners Newbies",
      "Learners",
    ];

    let playersPerCategory = totalPlayers / 8;
    let remainder = totalPlayers % 8;

    var startIndex = 0;
    let categories = Array.tabulate(
      8,
      func(i) {
        let extraPlayer = if (i < remainder) { 1 } else { 0 };
        let categorySize = playersPerCategory + extraPlayer;
        let endIndex = startIndex + categorySize;

        var categoryPlayers : [MemberProfileWithRank] = [];
        if (endIndex > startIndex and endIndex <= totalPlayers) {
          let slice = sortedMembers.sliceToArray(startIndex, endIndex);
          categoryPlayers := Array.tabulate(
            slice.size(),
            func(j) {
              let m = slice[j];
              {
                id = m.id;
                name = m.name;
                photo = m.photo;
                rating = m.rating;
                matchHistory = m.matchHistory;
                rank = startIndex + j + 1;
              };
            }
          );
        };

        startIndex += categorySize;

        {
          categoryName = categoryNames[i];
          players = categoryPlayers;
        };
      },
    );

    categories;
  };

  public shared ({ caller }) func importMemberData(memberData : [(Principal, MemberProfile)]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only main admin can import member data");
    };

    for ((principal, profile) in memberData.vals()) {
      members.add(principal, profile);
    };
  };

  public shared ({ caller }) func restoreDataFromLegacy(legacyData : [(Text, BannerPhoto)], legacyBannerList : [Text]) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can initiate data restoration");
    };

    for ((key, photo) in legacyData.vals()) {
      bannerPhotos.add(key, photo);
    };
    bannerPhotosList.clear();
    let validLegacyPhotos = legacyBannerList.filter(
      func(photoKey) {
        switch (bannerPhotos.get(photoKey)) {
          case (?_) { true };
          case (null) { false };
        };
      }
    );
    validLegacyPhotos.forEach(func(photoKey) { bannerPhotosList.add(photoKey) });
    true;
  };

  public query func isTournamentActive() : async Bool {
    tournamentState.status == #active;
  };

  public query func getTournamentState() : async TournamentState {
    tournamentState;
  };

  public shared ({ caller }) func announceTournament() : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can announce tournaments");
    };

    if (tournamentState.status != #notStarted and tournamentState.status != #completed) {
      Runtime.trap("Cannot announce tournament: Another tournament is in progress or already announced");
    };

    tournamentState := {
      tournamentState with
      status = #announced;
      registeredPlayers = [];
      currentRound = 0;
      rounds = [];
      playerStats = [];
      startTimestamp = null;
      endTimestamp = null;
    };
  };

  public shared ({ caller }) func startTournament() : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can start tournaments");
    };

    if (tournamentState.status != #announced) {
      Runtime.trap("Cannot start tournament: Tournament not in announced state");
    };

    tournamentState := {
      tournamentState with
      status = #active;
      startTimestamp = ?Time.now();
      currentRound = 0;
      rounds = [];
      playerStats = [];
    };
  };

  public shared ({ caller }) func pauseTournament() : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can pause tournaments");
    };

    if (tournamentState.status != #active) {
      Runtime.trap("Tournament is not active");
    };

    tournamentState := {
      tournamentState with
      status = #paused;
    };
  };

  public shared ({ caller }) func endTournament() : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can end tournaments");
    };

    if (tournamentState.status == #notStarted) {
      Runtime.trap("Tournament has not started");
    };

    tournamentState := {
      status = #completed;
      registeredPlayers = tournamentState.registeredPlayers;
      currentRound = tournamentState.currentRound;
      rounds = tournamentState.rounds;
      playerStats = tournamentState.playerStats;
      startTimestamp = tournamentState.startTimestamp;
      endTimestamp = tournamentState.startTimestamp;
    };
  };

  public shared ({ caller }) func resetTournament() : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can reset tournaments");
    };

    tournamentState := {
      status = #notStarted;
      registeredPlayers = [];
      currentRound = 0;
      rounds = [];
      playerStats = [];
      startTimestamp = null;
      endTimestamp = null;
    };
  };

  public shared ({ caller }) func registerForTournament() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register for tournaments");
    };

    if (tournamentState.status != #announced and tournamentState.status != #active) {
      Runtime.trap("Tournament registration is not open");
    };

    func contains(array : [RegisteredPlayer], value : Principal) : Bool {
      switch (array.find(func(player) { player.id == value })) {
        case (?_) { true };
        case (null) { false };
      };
    };

    if (contains(tournamentState.registeredPlayers, caller)) {
      Runtime.trap("Already registered for this tournament");
    };

    switch (members.get(caller)) {
      case (?memberProfile) {
        let newPlayer : RegisteredPlayer = {
          id = caller;
          name = memberProfile.name;
          photo = memberProfile.photo;
          rating = memberProfile.rating;
        };

        let updatedPlayers = tournamentState.registeredPlayers.concat([newPlayer]);
        tournamentState := {
          tournamentState with
          registeredPlayers = updatedPlayers;
        };
      };
      case (null) {
        Runtime.trap("Invalid member profile - cannot register for tournament");
      };
    };
  };

  public shared ({ caller }) func unregisterFromTournament() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can unregister from tournaments");
    };

    if (tournamentState.status == #active and tournamentState.currentRound > 0) {
      Runtime.trap("Cannot unregister after tournament has started");
    };

    let updatedPlayers = tournamentState.registeredPlayers.filter(
      func(player : RegisteredPlayer) : Bool { player.id != caller }
    );

    tournamentState := {
      tournamentState with
      registeredPlayers = updatedPlayers;
    };
  };

  public shared ({ caller }) func addPlayerToTournament(player : Principal) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can add players to tournaments");
    };

    if (tournamentState.registeredPlayers.find(func(p) { p.id == player }) != null) {
      Runtime.trap("Player is already registered");
    };

    switch (members.get(player)) {
      case (?memberProfile) {
        let newPlayer : RegisteredPlayer = {
          id = player;
          name = memberProfile.name;
          photo = memberProfile.photo;
          rating = memberProfile.rating;
        };

        let updatedPlayers = tournamentState.registeredPlayers.concat([newPlayer]);
        tournamentState := {
          tournamentState with
          registeredPlayers = updatedPlayers;
        };
      };
      case (null) {
        Runtime.trap("Member profile not found - cannot add player to tournament");
      };
    };
  };

  public shared ({ caller }) func removePlayerFromTournament(player : Principal) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can remove players from tournaments");
    };

    let updatedPlayers = tournamentState.registeredPlayers.filter(
      func(p : RegisteredPlayer) : Bool { p.id != player }
    );

    tournamentState := {
      tournamentState with
      registeredPlayers = updatedPlayers;
    };
  };

  public shared ({ caller }) func submitTournamentMatchScore(
    opponent : Principal,
    scoreA : Nat,
    scoreB : Nat,
    roundNumber : Nat,
    tableNumber : Nat
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can submit tournament match scores");
    };

    if (tournamentState.status != #active) {
      Runtime.trap("Tournament is not active");
    };

    if (not validateTournamentScore(scoreA, scoreB)) {
      Runtime.trap("Invalid tournament score: Must be best-of-three format (2-0), (2-1), (1-2), or (0-2)");
    };

    let timestamp = Time.now();
    let matchRecord : TournamentMatchScore = {
      playerA = caller;
      playerB = opponent;
      scoreA = scoreA;
      scoreB = scoreB;
      timestamp = timestamp;
      status = #pending;
      rejectionReason = null;
      roundNumber = roundNumber;
      tableNumber = tableNumber;
    };

    if (roundNumber >= tournamentState.rounds.size()) {
      Runtime.trap("Invalid round number");
    };

    let currentRound = tournamentState.rounds[roundNumber];
    let updatedMatches = currentRound.matches.concat([matchRecord]);
    let updatedRound = {
      currentRound with
      matches = updatedMatches;
    };

    let updatedRounds = Array.tabulate(
      tournamentState.rounds.size(),
      func(i : Nat) : TournamentRound {
        if (i == roundNumber) { updatedRound } else { tournamentState.rounds[i] };
      }
    );

    tournamentState := {
      tournamentState with
      rounds = updatedRounds;
    };
  };

  public shared ({ caller }) func submitTournamentMatchScoreWithPlayers(
    player1 : Principal,
    player2 : Principal,
    scoreA : Nat,
    scoreB : Nat,
    roundNumber : Nat,
    tableNumber : Nat
  ) : async () {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can submit matches with explicit players");
    };

    if (player1 == player2) {
      Runtime.trap("Player 1 and Player 2 must be different");
    };

    if (tournamentState.status != #active) {
      Runtime.trap("Tournament is not active");
    };

    if (not validateTournamentScore(scoreA, scoreB)) {
      Runtime.trap("Invalid tournament score: Must be best-of-three format (2-0), (2-1), (1-2), or (0-2)");
    };

    let timestamp = Time.now();
    let matchRecord : TournamentMatchScore = {
      playerA = player1;
      playerB = player2;
      scoreA = scoreA;
      scoreB = scoreB;
      timestamp = timestamp;
      status = #pending;
      rejectionReason = null;
      roundNumber = roundNumber;
      tableNumber = tableNumber;
    };

    if (roundNumber >= tournamentState.rounds.size()) {
      Runtime.trap("Invalid round number");
    };

    let currentRound = tournamentState.rounds[roundNumber];
    let updatedMatches = currentRound.matches.concat([matchRecord]);
    let updatedRound = {
      currentRound with
      matches = updatedMatches;
    };

    let updatedRounds = Array.tabulate(
      tournamentState.rounds.size(),
      func(i : Nat) : TournamentRound {
        if (i == roundNumber) { updatedRound } else { tournamentState.rounds[i] };
      }
    );

    tournamentState := {
      tournamentState with
      rounds = updatedRounds;
    };
  };

  public shared ({ caller }) func approveTournamentMatch(roundNumber : Nat, matchIndex : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can approve tournament matches");
    };

    if (roundNumber >= tournamentState.rounds.size()) {
      Runtime.trap("Invalid round number");
    };

    let currentRound = tournamentState.rounds[roundNumber];

    if (matchIndex >= currentRound.matches.size()) {
      Runtime.trap("Invalid match index");
    };

    let match = currentRound.matches[matchIndex];

    let canApprove = (caller == match.playerB) or isAdminOrScoreAuthAdmin(caller);

    if (not canApprove) {
      Runtime.trap("Unauthorized: Only the opponent or admins can approve this match");
    };

    let updatedMatch = { match with status = #approved };

    let updatedMatches = Array.tabulate(
      currentRound.matches.size(),
      func(i : Nat) : TournamentMatchScore {
        if (i == matchIndex) { updatedMatch } else { currentRound.matches[i] };
      }
    );

    let updatedRound = {
      currentRound with
      matches = updatedMatches;
    };

    let updatedRounds = Array.tabulate(
      tournamentState.rounds.size(),
      func(i : Nat) : TournamentRound {
        if (i == roundNumber) { updatedRound } else { tournamentState.rounds[i] };
      }
    );

    tournamentState := {
      tournamentState with
      rounds = updatedRounds;
    };
  };

  public shared ({ caller }) func rejectTournamentMatch(roundNumber : Nat, matchIndex : Nat, reason : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can reject tournament matches");
    };

    if (roundNumber >= tournamentState.rounds.size()) {
      Runtime.trap("Invalid round number");
    };

    let currentRound = tournamentState.rounds[roundNumber];

    if (matchIndex >= currentRound.matches.size()) {
      Runtime.trap("Invalid match index");
    };

    let match = currentRound.matches[matchIndex];

    let canReject = (caller == match.playerB) or isAdminOrScoreAuthAdmin(caller);

    if (not canReject) {
      Runtime.trap("Unauthorized: Only the opponent or admins can reject this match");
    };

    let updatedMatch = {
      match with
      status = #rejected;
      rejectionReason = reason;
    };

    let updatedMatches = Array.tabulate(
      currentRound.matches.size(),
      func(i : Nat) : TournamentMatchScore {
        if (i == matchIndex) { updatedMatch } else { currentRound.matches[i] };
      }
    );

    let updatedRound = {
      currentRound with
      matches = updatedMatches;
    };

    let updatedRounds = Array.tabulate(
      tournamentState.rounds.size(),
      func(i : Nat) : TournamentRound {
        if (i == roundNumber) { updatedRound } else { tournamentState.rounds[i] };
      }
    );

    tournamentState := {
      tournamentState with
      rounds = updatedRounds;
    };
  };

  public query func getTournamentLeaderboard() : async [TournamentLeaderboardEntry] {
    let sortedStats = tournamentState.playerStats.sort(
      func(a : TournamentPlayerStats, b : TournamentPlayerStats) : Order.Order {
        let pointsCompare = Nat.compare(b.points, a.points);
        if (pointsCompare != #equal) {
          return pointsCompare;
        };
        Nat.compare(b.wins, a.wins);
      }
    );

    Array.tabulate(
      sortedStats.size(),
      func(i : Nat) : TournamentLeaderboardEntry {
        let stats = sortedStats[i];
        let profile = members.get(stats.player);
        {
          player = stats.player;
          playerName = switch (profile) {
            case (?p) { p.name };
            case (null) { "Unknown" };
          };
          playerPhoto = switch (profile) {
            case (?p) { p.photo };
            case (null) { null };
          };
          wins = stats.wins;
          losses = stats.losses;
          points = stats.points;
          gamesWon = stats.gamesWon;
          gamesLost = stats.gamesLost;
          rank = i + 1;
        };
      }
    );
  };

  func generateClaimCode() : Text {
    let timestamp = Time.now();
    "CLAIM-".concat(timestamp.toText());
  };

  public query ({ caller }) func getRegisteredPlayerDetails() : async [RegisteredPlayer] {
    if (not isAdminOrScoreAuthAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins or score-authentication admins can view registered player details");
    };
    tournamentState.registeredPlayers;
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
    photo : ?Photo;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles ");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles ");
    };
    userProfiles.add(caller, profile);
  };
};
