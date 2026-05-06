"use client";

function pickFemaleVoice(langPrefix: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const femaleHints = ["female", "woman", "zira", "aria", "jenny", "susan", "sara", "sophie", "sofia", "ava", "emma", "karen", "hazel"];

  const exactLang = voices.find((v) =>
    v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()) &&
    femaleHints.some((hint) => v.name.toLowerCase().includes(hint))
  );
  if (exactLang) return exactLang;

  const anyFemale = voices.find((v) => femaleHints.some((hint) => v.name.toLowerCase().includes(hint)));
  if (anyFemale) return anyFemale;

  return null;
}

function pickStrictSofiaVoice(langPrefix: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const sofiaHints = ["sofia", "sophie"];
  const femaleHints = ["female", "woman", "zira", "aria", "jenny", "susan", "sara", "ava", "emma", "karen", "hazel"];

  const inLang = voices.find((v) =>
    v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()) &&
    sofiaHints.some((hint) => v.name.toLowerCase().includes(hint))
  );
  if (inLang) return inLang;

  const crossLang = voices.find((v) => sofiaHints.some((hint) => v.name.toLowerCase().includes(hint)));
  if (crossLang) return crossLang;

  return voices.find((v) =>
    v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()) &&
    femaleHints.some((hint) => v.name.toLowerCase().includes(hint))
  ) ?? null;
}

export function createSofiaUtterance(text: string, opts?: { lang?: string; rate?: number }) {
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = opts?.lang ?? "en-US";
  utterance.lang = lang;
  utterance.rate = opts?.rate ?? 0.92;

  const selected = pickFemaleVoice(lang);
  if (selected) utterance.voice = selected;

  return utterance;
}

export function createStrictSofiaUtterance(text: string, opts?: { lang?: string; rate?: number }) {
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = opts?.lang ?? "en-US";
  utterance.lang = lang;
  utterance.rate = opts?.rate ?? 0.92;

  const selected = pickStrictSofiaVoice(lang);
  if (!selected) return null;
  utterance.voice = selected;
  return utterance;
}

export function warmSofiaVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
}
