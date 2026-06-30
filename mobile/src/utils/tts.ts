import * as Speech from 'expo-speech';
import { useSettingsStore, VoiceGenderPreference } from '@/src/store/settingsStore';

let cachedVoices: Speech.Voice[] | null = null;
let currentGenderPref: VoiceGenderPreference | undefined;
let bestTrVoice: string | undefined;
let bestEnVoice: string | undefined;

const MALE_HINTS = ['cem', 'alex', 'aaron', 'fred', 'daniel', 'voice 2', 'voice 4', 'male', 'erkek', 'compact.tr-TR.Siri.Voice2'];
const FEMALE_HINTS = ['yelda', 'samantha', 'karen', 'moira', 'tessa', 'voice 1', 'voice 3', 'female', 'kadın', 'compact.tr-TR.Siri.Voice1'];

const getVoiceScore = (v: Speech.Voice, pref: VoiceGenderPreference) => {
  let score = 0;
  if (v.quality === Speech.VoiceQuality.Enhanced || v.name.toLowerCase().includes('premium') || v.identifier.toLowerCase().includes('premium') || v.name.toLowerCase().includes('siri')) {
    score += 10;
  }
  
  if (pref !== 'system') {
    const hints = pref === 'male' ? MALE_HINTS : FEMALE_HINTS;
    const isMatch = hints.some(hint => v.name.toLowerCase().includes(hint) || v.identifier.toLowerCase().includes(hint));
    if (isMatch) score += 20;
  }
  
  return score;
};

export const initTtsVoices = async (genderPref: VoiceGenderPreference) => {
  if (cachedVoices && currentGenderPref === genderPref) return;
  try {
    if (!cachedVoices) {
      cachedVoices = await Speech.getAvailableVoicesAsync();
    }
    currentGenderPref = genderPref;
    
    // Sort TR voices by score
    const trVoices = cachedVoices.filter(v => v.language.startsWith('tr')).sort((a, b) => getVoiceScore(b, genderPref) - getVoiceScore(a, genderPref));
    bestTrVoice = trVoices[0]?.identifier;

    // Sort EN voices by score
    const enVoices = cachedVoices.filter(v => v.language.startsWith('en')).sort((a, b) => getVoiceScore(b, genderPref) - getVoiceScore(a, genderPref));
    bestEnVoice = enVoices[0]?.identifier;
  } catch (error) {
    console.log('Failed to fetch TTS voices', error);
  }
};

export const speakText = async (text: string, language: 'en-US' | 'tr-TR', options?: Speech.SpeechOptions) => {
  const genderPref = useSettingsStore.getState().preferredVoiceGender;
  
  if (!cachedVoices || currentGenderPref !== genderPref) {
    await initTtsVoices(genderPref);
  }
  
  const voice = language === 'tr-TR' ? bestTrVoice : bestEnVoice;
  
  Speech.speak(text, {
    language,
    voice,
    ...options,
  });
};

export const stopTts = () => {
  Speech.stop();
};
