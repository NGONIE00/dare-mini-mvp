"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Audio quality presets ── */
export const QUALITY_PRESETS = {
  "2G": {
    label: "2G",
    desc: "~8 KB/min",
    encoderConfig: "speech_low_quality" as const,
  },
  "3G": {
    label: "3G",
    desc: "~32 KB/min",
    encoderConfig: "speech_standard" as const,
  },
  "WiFi": {
    label: "WiFi",
    desc: "~64 KB/min",
    encoderConfig: "music_standard" as const,
  },
} as const;

export type QualityKey = keyof typeof QUALITY_PRESETS;

export type VoiceState = {
  connected:     boolean;
  connecting:    boolean;
  muted:         boolean;
  speaking:      Record<number, boolean>; // uid → is speaking
  quality:       QualityKey;
  error:         string | null;
  canPublish:    boolean; // true for host or approved speakers
};

/* Convert UUID string to uint32 for Agora UID */
export function uuidToUid(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const ch = uuid.charCodeAt(i);
    hash = (Math.imul(31, hash) + ch) | 0;
  }
  return Math.abs(hash) % 2147483647;
}

type UseVoiceOptions = {
  roomId:      string;
  userId:      string | null;
  isHost:      boolean;
  autoJoin:    boolean; // join immediately when room is live
  onMuteCmd?:  (targetUid: number, muted: boolean) => void;
};

export function useVoice({ roomId, userId, isHost, autoJoin, onMuteCmd }: UseVoiceOptions) {
  const [state, setState] = useState<VoiceState>({
    connected:  false,
    connecting: false,
    muted:      true,
    speaking:   {},
    quality:    "3G",
    error:      null,
    canPublish: isHost,
  });

  const clientRef    = useRef<unknown>(null);
  const localTrack   = useRef<unknown>(null);
  const joinedRef    = useRef(false);

  /* ── helpers ── */
  const updateState = (patch: Partial<VoiceState>) =>
    setState(prev => ({ ...prev, ...patch }));

  /* ── fetch token ── */
  const fetchToken = useCallback(async (uid: number): Promise<string> => {
    const res = await fetch("/api/agora-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelName: roomId, uid }),
    });
    if (!res.ok) throw new Error("Token fetch failed");
    const { token } = await res.json();
    return token;
  }, [roomId]);

  /* ── join voice channel ── */
  const join = useCallback(async (quality: QualityKey = state.quality) => {
    if (!userId || joinedRef.current) return;
    updateState({ connecting: true, error: null });

    try {
      /* Dynamic import — Agora SDK is browser-only */
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      AgoraRTC.setLogLevel(3); // warn only

      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
      if (!appId) throw new Error("NEXT_PUBLIC_AGORA_APP_ID not set");

      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;

      const uid   = uuidToUid(userId);
      const token = await fetchToken(uid);

      /* Set role: host publishes, audience subscribes only */
      await client.setClientRole(isHost ? "host" : "audience");
      await client.join(appId, roomId, token, uid);
      joinedRef.current = true;

      /* If host, create + publish mic track immediately */
      if (isHost) {
        const track = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: QUALITY_PRESETS[quality].encoderConfig,
        });
        localTrack.current = track;
        await client.publish([track as never]);
        updateState({ canPublish: true });
      }

      /* ── Speaking detection ── */
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (vols: Array<{ uid: number; level: number }>) => {
        const speaking: Record<number, boolean> = {};
        vols.forEach(v => { speaking[v.uid] = v.level > 15; });
        updateState({ speaking });
      });

      /* ── Remote users ── */
      client.on("user-published", async (remoteUser: unknown, mediaType: string) => {
        if (mediaType === "audio") {
          await client.subscribe(remoteUser as never, "audio");
          (remoteUser as { audioTrack?: { play: () => void } }).audioTrack?.play();
        }
      });
      client.on("user-unpublished", async (remoteUser: unknown) => {
        await client.unsubscribe(remoteUser as never);
      });

      /* ── Stream messages (host → mute commands) ── */
      client.on("stream-message", (_uid: number, data: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(data));
          if (msg.type === "mute" && onMuteCmd) onMuteCmd(msg.uid, msg.muted);
        } catch { /* ignore */ }
      });

      updateState({ connected: true, connecting: false, muted: isHost ? false : true, quality });
    } catch (err: unknown) {
      updateState({
        connecting: false,
        error: err instanceof Error ? err.message : "Voice connection failed",
      });
    }
  }, [userId, isHost, roomId, state.quality, fetchToken, onMuteCmd]);

  /* ── leave ── */
  const leave = useCallback(async () => {
    if (!joinedRef.current || !clientRef.current) return;
    const client = clientRef.current as { leave: () => Promise<void> };
    if (localTrack.current) {
      const track = localTrack.current as { stop: () => void; close: () => void };
      track.stop(); track.close();
      localTrack.current = null;
    }
    await client.leave();
    joinedRef.current = false;
    updateState({ connected: false, muted: true, speaking: {}, canPublish: false });
  }, []);

  /* ── toggle mute ── */
  const toggleMute = useCallback(async () => {
    const track = localTrack.current as { setMuted: (m: boolean) => Promise<void> } | null;
    if (!track) return;
    const next = !state.muted;
    await track.setMuted(next);
    updateState({ muted: next });
  }, [state.muted]);

  /* ── become speaker (audience → host role, publish mic) ── */
  const startSpeaking = useCallback(async () => {
    if (!userId || !clientRef.current || !joinedRef.current) return;
    const client = clientRef.current as {
      setClientRole: (role: string) => Promise<void>;
      publish: (tracks: unknown[]) => Promise<void>;
    };
    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
    await client.setClientRole("host");
    const track = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: QUALITY_PRESETS[state.quality].encoderConfig,
    });
    localTrack.current = track;
    await client.publish([track as never]);
    updateState({ canPublish: true, muted: false });
  }, [userId, state.quality]);

  /* ── stop speaking (host → audience, unpublish mic) ── */
  const stopSpeaking = useCallback(async () => {
    if (!clientRef.current || !localTrack.current) return;
    const client = clientRef.current as {
      setClientRole: (role: string) => Promise<void>;
      unpublish: (tracks: unknown[]) => Promise<void>;
    };
    const track = localTrack.current as { stop: () => void; close: () => void };
    await client.unpublish([localTrack.current as never]);
    track.stop(); track.close();
    localTrack.current = null;
    await client.setClientRole("audience");
    updateState({ canPublish: false, muted: true });
  }, []);

  /* ── change audio quality ── */
  const setQuality = useCallback(async (q: QualityKey) => {
    updateState({ quality: q });
    const track = localTrack.current as { setEncoderConfiguration: (c: string) => Promise<void> } | null;
    if (track) {
      await track.setEncoderConfiguration(QUALITY_PRESETS[q].encoderConfig);
    }
  }, []);

  /* ── host: send mute command to remote user ── */
  const sendMuteCommand = useCallback(async (targetUid: number, muted: boolean) => {
    if (!clientRef.current || !isHost) return;
    const client = clientRef.current as {
      sendStreamMessage: (data: Uint8Array) => Promise<void>;
    };
    try {
      const msg = JSON.stringify({ type: "mute", uid: targetUid, muted });
      await client.sendStreamMessage(new TextEncoder().encode(msg));
    } catch { /* stream messages require published state */ }
  }, [isHost]);

  /* ── auto-join when room is live ── */
  useEffect(() => {
    if (autoJoin && userId && !joinedRef.current) {
      join();
    }
    return () => { leave(); };
  }, [autoJoin, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    join,
    leave,
    toggleMute,
    startSpeaking,
    stopSpeaking,
    setQuality,
    sendMuteCommand,
    localUid: userId ? uuidToUid(userId) : null,
  };
}
