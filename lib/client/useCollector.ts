"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AuthProvider, Settings } from "@netlify/identity";
import type { ReportRecord } from "@/lib/reporting/report";
import { initialiseIdentity, identityTimeout, type Identity } from "./collector-identity";
import { CollectorSession, type CollectorRequest } from "./collector-session";
import {
  claimCommunityReport, claimForReport, communitySyncCandidates, shouldRetryCommunityClaim, CommunityError, defaultLocalProfile, getLocalProfile,
  loadCommunity, persistLocalProfile, saveCommunityProfile, subscribeLocalProfile,
  type CommunitySnapshot, type LocalProfile, type ProfileUpdate,
} from "./community";

export type CollectorAuth = {
  ready: boolean;
  available: boolean;
  signedIn: boolean;
  settings: Settings | null;
  callback: "invite" | "recovery" | null;
  snapshotLoaded: boolean;
  sessionVersion: number;
};
const initialAuth: CollectorAuth = { ready: false, available: false, signedIn: false, settings: null, callback: null, snapshotLoaded: false, sessionVersion: 0 };
function authError(error: unknown) {
  const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
  if (status === 400 || status === 401 || status === 422) return "Check your sign-in details and whether your email has been confirmed.";
  if (status === 429) return "Too many sign-in attempts. Please wait before trying again.";
  return "Sign-in is unavailable. Use the hosted app and check that Identity is enabled. Local hunting still works.";
}

export default function useCollector() {
  const localProfile = useSyncExternalStore(subscribeLocalProfile, getLocalProfile, () => defaultLocalProfile);
  const [session] = useState(() => new CollectorSession());
  const operations = useSyncExternalStore(session.subscribe, session.getPendingCount, () => 0);
  const [initialising, setInitialising] = useState(true);
  const [snapshot, setSnapshot] = useState<CommunitySnapshot | null>(null);
  const [auth, setAuth] = useState<CollectorAuth>(initialAuth);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingClaims, setPendingClaims] = useState(0);
  const pending = useRef(new Set<string>());
  const inviteToken = useRef<string | null>(null);

  const observeIdentity = useCallback((userId: string | null, force = false) => {
    const changed = session.observeIdentity(userId, force);
    if (changed) {
      setSnapshot(null); pending.current.clear(); setPendingClaims(0);
      inviteToken.current = null; setError(null); setMessage(null);
    }
    setAuth(previous => ({ ...previous, signedIn: userId !== null, snapshotLoaded: session.snapshotLoaded,
      sessionVersion: session.sessionVersion, callback: changed ? null : previous.callback }));
    return changed;
  }, [session]);

  const acceptSnapshot = useCallback((value: CommunitySnapshot, ticket: CollectorRequest) => {
    const owned = session.currentUserId !== null && value.authenticated;
    const next = owned ? value : { ...value, authenticated: false, profile: null };
    session.verifySnapshot(ticket, owned);
    setSnapshot(previous => session.canCommit(ticket) ? next : previous);
    setAuth(previous => session.canCommit(ticket) ? { ...previous, snapshotLoaded: session.snapshotLoaded } : previous);
    setError(previous => session.canCommit(ticket) ? null : previous);
  }, [session]);

  const refresh = useCallback(() => session.run("read", loadCommunity, acceptSnapshot, (cause, ticket) => {
    setError(previous => session.canCommit(ticket) ? cause instanceof CommunityError ? cause.message : "The community board could not be loaded." : previous);
  }), [session, acceptSnapshot]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const initialStamp = session.identityStamp();
    void (async () => {
      try {
        // Subscribe before callback processing or getUser can emit an SDK auth event.
        const identity = await import("@netlify/identity");
        if (!active) return;
        unsubscribe = identity.onAuthChange((event, current) => {
          if (!active) return;
          const changed = observeIdentity(current?.id ?? null);
          if (event === "recovery") setAuth(previous => ({ ...previous, callback: "recovery" }));
          if (changed || !session.hasRequestedSnapshot) void refresh();
        });
        const state = await initialiseIdentity();
        if (!active) return;
        setAuth(previous => ({ ...previous, ready: true, available: state.available, settings: state.settings }));
        const readStamp = session.identityStamp();
        const user = state.available ? await identityTimeout(identity.getUser()) : null;
        if (!active) return;
        if (session.acceptsIdentity(readStamp)) observeIdentity(user?.id ?? null);
        const callbackOwned = state.callback?.user?.id === session.currentUserId;
        if (state.callback?.type === "invite" && session.currentUserId === null) {
          inviteToken.current = state.callback.token ?? null;
          setAuth(previous => ({ ...previous, callback: "invite" }));
          setMessage("Choose a password to accept your invitation.");
        } else if (state.callback?.type === "recovery" && callbackOwned) {
          setAuth(previous => ({ ...previous, callback: "recovery" }));
          setMessage("Choose a new password to finish account recovery.");
        } else if (state.callback && callbackOwned) setMessage("Your sign-in link has been confirmed.");
        if (state.callbackError && session.sameSession(initialStamp)) setMessage(state.callbackError);
      } catch {
        if (active) {
          setAuth(previous => ({ ...previous, ready: true, available: false }));
          if (session.sameSession(initialStamp)) setMessage("Sign in on the hosted app. Your local profile and collection still work here.");
        }
      } finally {
        if (active) {
          setInitialising(false);
          if (!session.hasRequestedSnapshot) void refresh();
        }
      }
    })();
    return () => { active = false; unsubscribe?.(); session.observeIdentity(null, true); };
  }, [session, observeIdentity, refresh]);

  const updateLocalProfile = useCallback((profile: LocalProfile) => {
    setError(null);
    try {
      const saved = persistLocalProfile(profile);
      setMessage(saved ? "Your collector profile is saved on this device." : "Your profile is available for this visit. Browser storage is unavailable.");
      return true;
    } catch { setError("Choose a nickname of 2 to 24 letters, numbers, spaces or simple punctuation."); return false; }
  }, []);

  const runAuth = useCallback(async (operation: (identity: Identity) => Promise<unknown>, success?: string) => {
    const ticket = session.begin("auth");
    setError(null); setMessage(null);
    try {
      const identity = await import("@netlify/identity");
      if (!session.sameSession(ticket)) return false;
      await operation(identity);
      if (success) setMessage(previous => session.canCommit(ticket) ? success : previous);
      return session.sameSession(ticket);
    } catch (cause) {
      setError(previous => session.canCommit(ticket) ? authError(cause) : previous);
      return false;
    } finally { session.finish(ticket); }
  }, [session]);

  const login = useCallback(async (email: string, password: string) => {
    if (!auth.available || !auth.settings?.providers.email) return false;
    return runAuth(identity => identity.login(email, password));
  }, [auth.available, auth.settings, runAuth]);

  const signup = useCallback(async (email: string, password: string) => {
    if (!auth.available || auth.settings?.disableSignup || !auth.settings?.providers.email) return false;
    return runAuth(identity => identity.signup(email, password), auth.settings.autoconfirm
      ? undefined : "Check your inbox and follow the confirmation link before signing in.");
  }, [auth.available, auth.settings, runAuth]);

  const logout = useCallback(async () => {
    // Drop private UI immediately, even if the SDK logout request is slow.
    observeIdentity(null, true);
    return runAuth(identity => identity.logout(), "Signed out. Your collection on this device is still available.");
  }, [observeIdentity, runAuth]);

  const oauth = useCallback(async (provider: AuthProvider) => {
    if (!auth.available || provider === "email" || !auth.settings?.providers[provider]) return;
    return runAuth(async identity => { identity.oauthLogin(provider); });
  }, [auth.available, auth.settings, runAuth]);

  const completeAccount = useCallback(async (password: string) => {
    const callback = auth.callback;
    const token = inviteToken.current;
    const stamp = session.identityStamp();
    const completed = await runAuth(async identity => {
      if (callback === "invite" && token) await identity.acceptInvite(token, password);
      else if (callback === "recovery") await identity.updateUser({ password });
      else return;
    }, "Your password has been saved. Your collector account is ready.");
    if (completed && session.sameSession(stamp)) {
      inviteToken.current = null;
      setAuth(previous => session.sameSession(stamp) ? { ...previous, callback: null } : previous);
    }
    return completed;
  }, [auth.callback, session, runAuth]);

  const saveProfile = useCallback(async (profile: ProfileUpdate) => {
    if (session.sessionVersion !== auth.sessionVersion) return false;
    if (session.currentUserId !== null && !session.snapshotLoaded) {
      setError("Wait for your current collector profile to load before saving community settings.");
      return false;
    }
    if (!updateLocalProfile({ displayName: profile.displayName, avatar: profile.avatar })) return false;
    if (session.currentUserId === null) return true;
    return session.run("write", () => saveCommunityProfile(profile), (value, ticket) => {
      acceptSnapshot(value, ticket);
      setMessage(previous => session.canCommit(ticket) ? profile.published
        ? "Your nickname, avatar and score are public on the community board." : "Your community profile is private." : previous);
    }, (cause, ticket) => {
      setError(previous => session.canCommit(ticket) ? cause instanceof CommunityError ? cause.message : "Your community profile could not be saved. The device profile is saved." : previous);
    });
  }, [session, auth.sessionVersion, updateLocalProfile, acceptSnapshot]);

  const claimReport = useCallback(async (report: ReportRecord) => {
    if (!claimForReport(report) || session.currentUserId === null || session.sessionVersion !== auth.sessionVersion) return false;
    return session.run("write", () => claimCommunityReport(report), (result, ticket) => {
      acceptSnapshot({ authenticated: result.authenticated, profile: result.profile, leaderboard: result.leaderboard }, ticket);
      pending.current.delete(report.id);
      setPendingClaims(previous => session.canCommit(ticket) ? pending.current.size : previous);
      setMessage(previous => session.canCommit(ticket) ? result.duplicate
        ? "This capture is already counted on your community score."
        : "Real capture added to your community score: +" + result.awardedXp + " XP." : previous);
    }, (cause, ticket) => {
      if (shouldRetryCommunityClaim(cause)) pending.current.add(report.id);
      else pending.current.delete(report.id);
      setPendingClaims(previous => session.canCommit(ticket) ? pending.current.size : previous);
      setError(previous => session.canCommit(ticket) ? cause instanceof CommunityError ? cause.message : "Community scoring is pending. Your local capture is saved." : previous);
    });
  }, [session, auth.sessionVersion, acceptSnapshot]);

  const syncReports = useCallback(async (reports: readonly ReportRecord[]) => {
    const stamp = session.identityStamp();
    if (session.currentUserId === null) return { synced: 0, attempted: 0 };
    const eligible = communitySyncCandidates(reports, pending.current);
    const eligibleIds = new Set(eligible.map(report => report.id));
    for (const id of pending.current) if (!eligibleIds.has(id)) pending.current.delete(id);
    setPendingClaims(pending.current.size);
    let synced = 0;
    for (const report of eligible) {
      if (!session.acceptsIdentity(stamp)) break;
      if (await claimReport(report)) synced++;
    }
    if (eligible.length === 0 && session.acceptsIdentity(stamp)) setMessage("No eligible real captures to sync. Samples and scans made before sign-in stay on this device.");
    return { synced, attempted: eligible.length };
  }, [session, claimReport]);

  return { localProfile, updateLocalProfile, snapshot, loading: initialising || operations > 0, error, message, auth, pendingClaims,
    login, signup, logout, oauth, completeAccount, saveProfile, claimReport, syncReports, refresh };
}

export type CollectorController = ReturnType<typeof useCollector>;
