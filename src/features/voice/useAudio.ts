import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder as useExpoAudioRecorder,
  useAudioPlayer as useExpoAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import { File as ExpoFile } from 'expo-file-system';

import { env } from '@/lib/env';
import { logDev } from '@/lib/log';

// ---------------------------------------------------------------------------
// Recording hook — captures microphone audio using expo-audio
// ---------------------------------------------------------------------------

export type RecordingStatus = 'idle' | 'recording' | 'processing';

interface UseAudioRecorderReturn {
  recordingStatus: RecordingStatus;
  startRecording: () => Promise<void>;
  stopAndTranscribe: () => Promise<string | null>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  // LOW_QUALITY = smaller file = faster Whisper upload & transcription
  const recorder = useExpoAudioRecorder(RecordingPresets.LOW_QUALITY, (status) => {
    logDev('audio_recorder', { isFinished: status.isFinished, hasError: status.hasError, error: status.error });
  });

  const startRecording = useCallback(async () => {
    try {
      logDev('audio', 'Requesting microphone permission...');
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        logDev('audio', 'Microphone permission denied');
        return;
      }
      logDev('audio', 'Permission granted, setting audio mode...');

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      logDev('audio', 'Preparing recorder...');
      await recorder.prepareToRecordAsync();
      logDev('audio', 'Starting recording...');
      recorder.record();
      setRecordingStatus('recording');
      logDev('audio', `Recording started, isRecording: ${recorder.isRecording}`);
    } catch (error) {
      logDev('audio_error', { action: 'startRecording', error: String(error) });
      setRecordingStatus('idle');
    }
  }, [recorder]);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    setRecordingStatus('processing');
    try {
      logDev('audio', `Stopping recording... currentTime=${recorder.currentTime}, isRecording=${recorder.isRecording}`);
      await recorder.stop();

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
      logDev('audio', `Transcript: "${data.text}"`);
      setRecordingStatus('idle');
      return data.text ?? null;
    } catch (error) {
      logDev('audio_error', { action: 'stopAndTranscribe', error: String(error) });
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
  speak: (text: string) => Promise<void>;
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

  const speak = useCallback(async (text: string) => {
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

      // Get the audio URL directly from the response
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
      });

      player.replace({ uri: base64 });
      player.play();
      setPlaybackStatus('playing');
      logDev('tts', 'Playing audio');
    } catch (error) {
      logDev('tts_error', { error: String(error) });
      if (mountedRef.current) setPlaybackStatus('idle');
    }
  }, [player]);

  const stop = useCallback(async () => {
    player.pause();
    setPlaybackStatus('idle');
  }, [player]);

  return { playbackStatus, speak, stop };
}
