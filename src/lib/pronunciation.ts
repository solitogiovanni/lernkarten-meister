// Retain the utterance until completion, including while Safari starts audio.
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakGerman(text: string, onError?: (message: string) => void) {
  if (!text.trim()) return;
  if (typeof window === "undefined" || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
    onError?.("Pronunciation is not supported by this browser.");
    return;
  }

  const synthesis = window.speechSynthesis;
  try {
    // An idle cancel can interfere with Safari's first playback. Only replace
    // speech that is actually active; never defer speak beyond the user's tap.
    if (synthesis.speaking || synthesis.pending) synthesis.cancel();
    activeUtterance = null;
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = "de-DE";
    utterance.rate = 0.95;
    const voices = synthesis.getVoices().filter((voice) => /^de(?:[-_]|$)/i.test(voice.lang));
    const voice = voices.find((candidate) => candidate.localService && candidate.lang.toLowerCase() === "de-de")
      ?? voices.find((candidate) => candidate.localService)
      ?? voices.find((candidate) => /google|microsoft|natural|premium/i.test(candidate.name))
      ?? voices[0];
    // Safari may initially return no voices: use lang rather than waiting for
    // voiceschanged, which would lose the original user activation.
    if (voice) utterance.voice = voice;
    activeUtterance = utterance;
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };
    utterance.onerror = (event) => {
      if (activeUtterance !== utterance) return;
      activeUtterance = null;
      if (event.error !== "canceled" && event.error !== "interrupted") {
        onError?.("Pronunciation could not play. Check your device volume and German voice settings, then try again.");
      }
    };
    if (synthesis.paused) synthesis.resume();
    synthesis.speak(utterance);
  } catch {
    activeUtterance = null;
    onError?.("Pronunciation could not play. Please try again.");
  }
}