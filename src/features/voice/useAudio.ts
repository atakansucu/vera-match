import { useCallback, useEffect, useState } from 'react';
import {
  useAudioRecorder as useExpoAudioRecorder,
  useAudioPlayer as useExpoAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';

import { env } from '@/lib/env';

// ---------------------------------------------------------------------------
// Recording hook — captures microphone audio using expo-audio
// ---------------------------------------------------------------------------

export type RecordingStatus = 'idle' | 'recording' | 'processing';

interface UseAudioRecorderReturn {
  recordingStatus: RecordingStatus;
  /** Start recording from the microphone. */
  startRecording: () => Promise<void>;
  /** Stop recording and transcribe via Whisper. Returns the transcript text. */
  stopAndTranscribe: () => Promise<string | null>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingStatus('recording');
    } catch (error) {
      console.warn('[audio] Failed to start recording:', error);
    }
  }, [recorder]);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    setRecordingStatus('processing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;

      if (!uri) {
        setRecordingStatus('idle');
        return null;
      }

      const serverUrl = env.devRealtimeUrl;
      if (!serverUrl) {
        setRecordingStatus('idle');
        return null;
      }

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as unknown as Blob);
      formData.append('model', 'whisper-1');

      const res = await fetch(`${serverUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        console.warn('[audio] Transcription failed:', res.status);
        setRecordingStatus('idle');
        return null;
      }

      const data = (await res.json()) as { text?: string };
      setRecordingStatus('idle');
      return data.text ?? null;
    } catch (error) {
      console.warn('[audio] Transcription error:', error);
      setRecordingStatus('idle');
      return null;
    }
  }, [recorder]);

  return { recordingStatus, startRecording, stopAndTranscribe };
}

// ---------------------------------------------------------------------------
// Playback hook — plays TTS audio from the dev server
// ---------------------------------------------------------------------------

export type PlaybackStatus = 'idle' | 'loading' | 'playing';

interface UseAudioPlayerReturn {
  playbackStatus: PlaybackStatus;
  /** Convert text to speech and play it. */
  speak: (text: string) => Promise<void>;
  /** Stop current playback. */
  stop: () => Promise<void>;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const player = useExpoAudioPlayer(null);

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) {
        setPlaybackStatus('idle');
      }
    });
    return () => subscription.remove();
  }, [player]);

  const speak = useCallback(async (text: string) => {
    const serverUrl = env.devRealtimeUrl;
    if (!serverUrl || !text.trim()) return;

    setPlaybackStatus('loading');

    try {
      const res = await fetch(`${serverUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.warn('[audio] TTS failed:', res.status);
        setPlaybackStatus('idle');
        return;
      }

      const blob = await res.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      player.replace({ uri: base64 });
      player.play();
      setPlaybackStatus('playing');
    } catch (error) {
      console.warn('[audio] Playback error:', error);
      setPlaybackStatus('idle');
    }
  }, [player]);

  const stop = useCallback(async () => {
    player.pause();
    setPlaybackStatus('idle');
  }, [player]);

  return { playbackStatus, speak, stop };
}
