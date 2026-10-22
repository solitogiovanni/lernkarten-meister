import { afterEach, beforeEach, expect, test } from "bun:test";
import { speakGerman } from "./pronunciation";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalUtterance = Object.getOwnPropertyDescriptor(globalThis, "SpeechSynthesisUtterance");
let calls: string[];
let spoken: SpeechSynthesisUtterance | undefined;
let voices: SpeechSynthesisVoice[];
let synthesis: SpeechSynthesis;

beforeEach(() => {
  calls = [];
  voices = [];
  spoken = undefined;
  synthesis = {
    speaking: false, pending: false, paused: false,
    cancel: () => calls.push("cancel"),
    resume: () => calls.push("resume"),
    getVoices: () => voices,
    speak: (utterance: SpeechSynthesisUtterance) => { spoken = utterance; calls.push("speak"); },
  } as unknown as SpeechSynthesis;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { speechSynthesis: synthesis } });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    configurable: true,
    value: class { constructor(public text: string) {} },
  });
});

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
  if (originalUtterance) Object.defineProperty(globalThis, "SpeechSynthesisUtterance", originalUtterance);
  else Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
});

test("first tap speaks synchronously without cancel, even before Safari loads voices", () => {
  speakGerman("das Haus");
  expect(calls).toEqual(["speak"]);
  expect(spoken?.text).toBe("das Haus");
  expect(spoken?.lang).toBe("de-DE");
});

test("prefers an installed German voice over a network voice", () => {
  voices = [
    { name: "Google Deutsch", lang: "de-DE", localService: false },
    { name: "Anna", lang: "de-DE", localService: true },
  ] as SpeechSynthesisVoice[];
  speakGerman("Hallo");
  expect(spoken?.voice).toBe(voices[1]);
});

test("replaces active speech and resumes a paused engine", () => {
  Object.assign(synthesis, { speaking: true, paused: true });
  speakGerman("Guten Morgen");
  expect(calls).toEqual(["cancel", "resume", "speak"]);
});

test("reports playback failures instead of silently swallowing them", () => {
  const errors: string[] = [];
  speakGerman("Hallo", (message) => errors.push(message));
  spoken?.onerror?.call(spoken, { error: "audio-busy" } as SpeechSynthesisErrorEvent);
  expect(errors).toHaveLength(1);
});

test("replacing speech does not report the canceled utterance as a failure", () => {
  const errors: string[] = [];
  speakGerman("Hallo", (message) => errors.push(message));
  const previous = spoken;
  Object.assign(synthesis, { speaking: true });
  speakGerman("Tschüss", (message) => errors.push(message));
  previous?.onerror?.call(previous, { error: "interrupted" } as SpeechSynthesisErrorEvent);
  expect(errors).toHaveLength(0);
  expect(spoken?.text).toBe("Tschüss");
});