import { useCallback, useRef, useState } from 'react';

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { logDev } from '@/lib/log';

// ---------------------------------------------------------------------------
// Streaming transcription hook — uses native on-device speech recognition
// to provide real-time partial results while the user speaks.
// ---------------------------------------------------------------------------

export interface UseStreamingTranscriptionReturn {
  /** Current partial transcript (updates in real-time as user speaks). */
  partialTranscript: string;
  /** Whether speech recognition is currently running. */
  isRecognizing: boolean;
  /** Whether native speech recognition is available on this device. */
  isAvailable: boolean;
  /** Start native speech recognition. */
  startRecognition: () => Promise<boolean>;
  /** Stop recognition and return the final transcript. */
  stopRecognition: () => Promise<string | null>;
  /** Abort recognition without returning a result. */
  abortRecognition: () => void;
}

/**
 * Hook that wraps `expo-speech-recognition` for real-time streaming
 * transcription. Provides partial results word-by-word while the user
 * speaks, with zero network latency (on-device recognition).
 *
 * Falls back gracefully when native recognition is unavailable — callers
 * should check `isAvailable` and use Whisper as a fallback.
 */
export function useStreamingTranscription(): UseStreamingTranscriptionReturn {
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);

  const finalTranscriptRef = useRef<string | null>(null);
  const resolveStopRef = useRef<((transcript: string | null) => void) | null>(null);

  let available = false;
  try {
    available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    available = false;
  }

  // --- Event listeners ---

  useSpeechRecognitionEvent('start', () => {
    logDev('speech_recognition', 'Started');
    setIsRecognizing(true);
  });

  useSpeechRecognitionEvent('end', () => {
    logDev('speech_recognition', 'Ended');
    setIsRecognizing(false);

    // Resolve the stop promise with the final transcript
    if (resolveStopRef.current) {
      resolveStopRef.current(finalTranscriptRef.current);
      resolveStopRef.current = null;
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    logDev('speech_recognition', `Result: "${transcript}" isFinal=${event.isFinal}`);

    if (event.isFinal) {
      finalTranscriptRef.current = transcript;
      setPartialTranscript(transcript);
    } else {
      setPartialTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    logDev('speech_recognition_error', { code: event.error, message: event.message });

    // On error, resolve with whatever we have
    if (resolveStopRef.current) {
      const fallback = finalTranscriptRef.current ?? (partialTranscript || null);
      resolveStopRef.current(fallback);
      resolveStopRef.current = null;
    }
  });

  // --- Public API ---

  const startRecognition = useCallback(async (): Promise<boolean> => {
    if (!available) {
      logDev('speech_recognition', 'Not available on this device');
      return false;
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        logDev('speech_recognition', 'Permission denied');
        return false;
      }

      finalTranscriptRef.current = null;
      setPartialTranscript('');

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
      });

      return true;
    } catch (error) {
      logDev('speech_recognition_error', { action: 'start', error: String(error) });
      return false;
    }
  }, [available]);

  const stopRecognition = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveStopRef.current = resolve;

      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // If stop fails, resolve with what we have
        resolve(finalTranscriptRef.current ?? (partialTranscript || null));
        resolveStopRef.current = null;
      }

      // Safety timeout: resolve after 3s if no end event fires
      setTimeout(() => {
        if (resolveStopRef.current) {
          logDev('speech_recognition', 'Stop timeout — resolving with partial');
          resolveStopRef.current(finalTranscriptRef.current ?? (partialTranscript || null));
          resolveStopRef.current = null;
        }
      }, 3000);
    });
  }, [partialTranscript]);

  const abortRecognition = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // Ignore — may not be recognizing
    }
    setPartialTranscript('');
    finalTranscriptRef.current = null;
    resolveStopRef.current = null;
  }, []);

  return {
    partialTranscript,
    isRecognizing,
    isAvailable: available,
    startRecognition,
    stopRecognition,
    abortRecognition,
  };
}
