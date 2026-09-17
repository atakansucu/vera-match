import * as ImagePicker from 'expo-image-picker';

/**
 * Launches the OS image library and returns a local URI, or null if the user
 * cancelled or denied access. The URI is uploaded to a PRIVATE bucket by the
 * backend; it is never made public.
 */
export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.7,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}
