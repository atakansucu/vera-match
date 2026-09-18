import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder as useExpoAudioRecorder,
  useAudioPlayer as useExpoAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import { File as ExpoFile } from 'expo-file-system';

import { env } from '@/lib/env';
import { logDev } from '@/lib/log';

import { useStreamingTranscription } from './useStreamingTranscription';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Recording hook — captures microphone audio using expo-audio, with optional
// native streaming speech recognition for real-time partial transcription.
// ---------------------------------------------------------------------------

export type RecordingStatus = 'idle' | 'recording' | 'processing';

interface UseAudioRecorderReturn {
  recordingStatus: RecordingStatus;
  /** Real-time partial transcript while recording (empty if native recognition unavailable). */
  partialTranscript: string;
  /** Whether native streaming recognition is being used (vs Whisper fallback). */
  useNativeRecognition: boolean;
  startRecording: () => Promise<void>;
  stopAndTranscribe: () => Promise<string | null>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const startTimeRef = useRef<number>(0);
  /** Whether the current recording session uses native recognition (no expo-audio). */
  const usingNativeRef = useRef(false);

  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    logDev('audio_recorder', { isFinished: status.isFinished, hasError: status.hasError, error: status.error });
  });

  const {
    partialTranscript,
    isAvailable: nativeAvailable,
    startRecognition,
    stopRecognition,
    abortRecognition,
  } = useStreamingTranscription();

  const startRecording = useCallback(async () => {
    try {
      logDev('audio', 'Requesting microphone permission...');
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        logDev('audio', 'Microphone permission denied');
        return;
      }

      // Try native speech recognition first — it provides real-time
      // streaming transcription with zero network latency.
      if (nativeAvailable) {
        logDev('audio', 'Starting native speech recognition (streaming mode)...');
        const started = await startRecognition();
        if (started) {
          usingNativeRef.current = true;
          startTimeRef.current = Date.now();
          setRecordingStatus('recording');
          logDev('audio', 'Native speech recognition started');
          return;
        }
        logDev('audio', 'Native recognition failed to start, falling back to Whisper');
      }

      // Fallback: record audio for Whisper transcription
      usingNativeRef.current = false;
      logDev('audio', 'Permission granted, resetting audio session for recording...');

      await setIsAudioActiveAsync(false);
      await delay(100);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });
      await setIsAudioActiveAsync(true);

      logDev('audio', 'Preparing recorder...');
      await recorder.prepareToRecordAsync();
      logDev('audio', 'Starting recording...');
      startTimeRef.current = Date.now();
      recorder.record();
      setRecordingStatus('recording');
      logDev('audio', `Recording started, isRecording: ${recorder.isRecording}`);
    } catch (error) {
      logDev('audio_error', { action: 'startRecording', error: String(error) });
      setRecordingStatus('idle');
    }
  }, [recorder, nativeAvailable, startRecognition]);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    setRecordingStatus('processing');
    const elapsedMs = Date.now() - startTimeRef.current;

    // --- Native speech recognition path ---
    if (usingNativeRef.current) {
      try {
        logDev('audio', `Stopping native recognition... elapsed=${elapsedMs}ms`);

        if (elapsedMs < 1000) {
          logDev('audio', `Recording too short (${elapsedMs}ms), aborting`);
          abortRecognition();
          setRecordingStatus('idle');
          return null;
        }

        const transcript = await stopRecognition();
        logDev('audio', `Native transcript: "${transcript}"`);

        if (transcript && transcript.length < 3) {
          logDev('audio', `Transcript too short ("${transcript}"), skipping`);
          setRecordingStatus('idle');
          return null;
        }

        setRecordingStatus('idle');
        return transcript;
      } catch (error) {
        logDev('audio_error', { action: 'stopNativeRecognition', error: String(error) });
        setRecordingStatus('idle');
        return null;
      }
    }

    // --- Whisper fallback path ---
    try {
      logDev('audio', `Stopping recording... elapsed=${elapsedMs}ms`);

      await recorder.stop();

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });

      if (elapsedMs < 1000) {
        logDev('audio', `Recording too short (${elapsedMs}ms), skipping transcription`);
        setRecordingStatus('idle');
        return null;
      }

      const uri = recorder.uri;
      logDev('audio', `Recording URI: ${uri}, finalTime=${recorder.currentTime}`);

      if (!uri) {
        logDev('audio', 'No recording URI available');
        setRecordingStatus('idle');
        return null;
      }

      const serverUrl = env.devRealtimeUrl;
      if (!serverUrl) {
        logDev('audio', 'No dev server URL configured');
        setRecordingStatus('idle');
        return null;
      }

      logDev('audio', 'Reading audio file...');
      const file = new ExpoFile(uri);
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);
      logDev('audio', `Audio size: ${bytes.length} bytes, base64: ${base64Audio.length}`);

      logDev('audio', 'Sending to Whisper...');
      const res = await fetch(`${serverUrl}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio, format: 'm4a' }),
      });

      if (!res.ok) {
        const errText = await res.text();
        logDev('audio_error', { action: 'transcribe', status: res.status, body: errText });
        setRecordingStatus('idle');
        return null;
      }

      const data = (await res.json()) as { text?: string };
      const transcript = data.text?.trim() ?? null;
      logDev('audio', `Transcript: "${transcript}"`);

      if (transcript !== null && transcript.length < 3) {
        logDev('audio', `Transcript too short ("${transcript}"), skipping`);
        setRecordingStatus('idle');
        return null;
      }

      setRecordingStatus('idle');
      return transcript;
    } catch (error) {
      logDev('audio_error', { action: 'stopAndTranscribe', error: String(error) });
      setRecordingStatus('idle');
      return null;
    }
  }, [recorder, stopRecognition, abortRecognition]);

  return {
    recordingStatus,
    partialTranscript,
    useNativeRecognition: nativeAvailable,
    startRecording,
    stopAndTranscribe,
  };
}

// ---------------------------------------------------------------------------
// Playback hook — plays TTS audio from the dev server
// ---------------------------------------------------------------------------

export type PlaybackStatus = 'idle' | 'loading' | 'playing';

interface SpeakOptions {
  /** Called when audio playback actually starts (not when loading begins). */
  onPlaybackStart?: () => void;
}

interface UseAudioPlayerReturn {
  playbackStatus: PlaybackStatus;
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop: () => Promise<void>;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const player = useExpoAudioPlayer(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (s) => {
      if (!mountedRef.current) return;
      if ('didJustFinish' in s && s.didJustFinish) {
        setPlaybackStatus('idle');
      }
    });
    return () => subscription.remove();
  }, [player]);

  const speak = useCallback(async (text: string, options?: SpeakOptions) => {
    const serverUrl = env.devRealtimeUrl;
    if (!serverUrl || !text.trim()) return;

    setPlaybackStatus('loading');
    logDev('tts', `Requesting TTS for: "${text.slice(0, 50)}..."`);

    try {
      const res = await fetch(`${serverUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        logDev('tts_error', { status: res.status });
        if (mountedRef.current) setPlaybackStatus('idle');
        return;
      }

      const blob = await res.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      if (!mountedRef.current) return;

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });

      player.replace({ uri: base64 });
      player.play();
      setPlaybackStatus('playing');
      options?.onPlaybackStart?.();
      logDev('tts', 'Playing audio');
    } catch (error) {
      logDev('tts_error', { error: String(error) });
      if (mountedRef.current) setPlaybackStatus('idle');
    }
  }, [player]);

  const stop = useCallback(async () => {
    player.pause();
    // Deactivate session so the recorder can cleanly acquire it.
    await setIsAudioActiveAsync(false);
    setPlaybackStatus('idle');
  }, [player]);

  return { playbackStatus, speak, stop };
}
