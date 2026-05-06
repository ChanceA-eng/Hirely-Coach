/**
 * Central phonetics map: English word → Swahili-readable phonetic transcription.
 * These are approximate phonetics written so a Swahili speaker can sound out the English word.
 *
 * How to read:
 *   - Use Swahili vowel sounds (a=ah, e=eh, i=ee, o=oh, u=oo)
 *   - Consonant clusters are written as heard
 *   - Stress syllable is written in CAPS
 */
export const PHONETICS: Record<string, string> = {
  // ── A ──────────────────────────────────────────────────────────────────
  Apple:       "APO",
  Cat:         "kat",
  Father:      "FA-tha",
  Cake:        "keik",
  Fate:        "feit",
  Gate:        "geit",
  Agreement:   "a-GRII-ment",
  Application: "a-pli-KEI-shun",
  Availability: "a-vei-la-BI-li-ti",

  // ── B ──────────────────────────────────────────────────────────────────
  Budget:      "BA-jit",
  Boss:        "bos",
  Business:    "BIZ-nis",
  Bread:       "bred",
  Back:        "bak",
  Buy:         "bai",

  // ── C ──────────────────────────────────────────────────────────────────
  Contract:    "KON-trakt",
  Cup:         "kap",
  Cost:        "kost",
  City:        "SI-ti",
  Circle:      "SO-kel",
  Cycle:       "SAI-kel",
  Call:        "kol",

  // ── D ──────────────────────────────────────────────────────────────────
  Data:        "DEI-ta",
  Deadline:    "DED-lain",
  Duck:        "dak",
  Doctor:      "dokta",

  // ── E ──────────────────────────────────────────────────────────────────
  Email:       "II-meil",
  Effort:      "E-fot",
  Error:       "E-ra",
  Eager:       "II-ga",
  Equal:       "II-kwel",
  Event:       "i-VENT",
  Eye:         "ai",
  Eggs:        "egz",
  Experience:  "ik-SPII-ri-ens",

  // ── F ──────────────────────────────────────────────────────────────────
  Finance:     "FAI-nans",
  Focus:       "FOU-kas",
  Feedback:    "FIID-bak",
  Finish:      "FI-nish",
  Fruits:      "fruuts",

  // ── G ──────────────────────────────────────────────────────────────────
  Goal:        "goul",
  Growth:      "grouth",
  Gain:        "gein",

  // ── H ──────────────────────────────────────────────────────────────────
  Hire:        "HAI-ya",
  Help:        "help",
  Handle:      "HAN-del",
  Hand:        "hand",
  Head:        "hed",
  Hurt:        "hat",

  // ── I ──────────────────────────────────────────────────────────────────
  Interview:   "IN-ta-vyuu",
  Idea:        "ai-DII-ya",
  Improve:     "im-PRUUV",

  // ── J ──────────────────────────────────────────────────────────────────
  Job:         "job",
  Join:        "join",
  Journey:     "JOO-ni",

  // ── K ──────────────────────────────────────────────────────────────────
  Knowledge:   "NO-lij",
  Key:         "kii",

  // ── L ──────────────────────────────────────────────────────────────────
  Lead:        "liid",
  Learn:       "leon",
  Leg:         "leg",

  // ── M ──────────────────────────────────────────────────────────────────
  Manage:      "MA-nij",
  Meet:        "miit",
  Milk:        "milk",
  Meat:        "miit",

  // ── N ──────────────────────────────────────────────────────────────────
  Network:     "NET-wok",
  Negotiate:   "ni-GOU-shi-eit",

  // ── O ──────────────────────────────────────────────────────────────────
  Opportunity: "o-po-CHUU-ni-ti",
  Organize:    "O-ga-naiz",
  Octopus:     "OK-to-pas",
  Offer:       "O-fa",

  // ── P ──────────────────────────────────────────────────────────────────
  Plan:        "plan",
  Present:     "pri-ZENT",
  Pain:        "pein",
  Price:       "prais",

  // ── Q ──────────────────────────────────────────────────────────────────
  Quality:     "KWO-li-ti",
  Quick:       "kwik",
  Qualification: "kwo-li-fi-KEI-shun",

  // ── R ──────────────────────────────────────────────────────────────────
  Result:      "ri-ZALT",
  Resume:      "RE-zyu-mei",
  Read:        "riid",
  Rice:        "rais",
  Reference:   "RE-fa-rens",

  // ── S ──────────────────────────────────────────────────────────────────
  Strategy:    "STRA-ti-ji",
  Success:     "sak-SES",
  Send:        "send",
  Sick:        "sik",
  Stomach:     "stamaki",
  Strength:    "strength",

  // ── T ──────────────────────────────────────────────────────────────────
  Team:        "tiim",
  Target:      "TAA-git",
  Task:        "task",

  // ── U ──────────────────────────────────────────────────────────────────
  Unicorn:     "YUU-ni-koon",
  Under:       "AN-da",

  // ── V ──────────────────────────────────────────────────────────────────
  Value:       "VAL-yuu",
  Verify:      "VE-ri-fai",

  // ── W ──────────────────────────────────────────────────────────────────
  Work:        "wook",
  Win:         "win",
  Water:       "wara",
  Write:       "rait",
  Weakness:    "WIK-nis",

  // ── X ──────────────────────────────────────────────────────────────────
  Excel:       "ik-SEL",
  Xerox:       "ZII-roks",

  // ── Y ──────────────────────────────────────────────────────────────────
  Yield:       "yiild",
  Yes:         "yes",

  // ── Z ──────────────────────────────────────────────────────────────────
  Zero:        "ZII-rou",
  Zone:        "zoun",

  // ── Vocabulary (Module 3) ──────────────────────────────────────────────
  Meeting:     "MII-ting",
  Report:      "ri-POOT",
  Manager:     "MA-ni-ja",
  Schedule:    "SKE-dyuul",
  Department:  "di-PAAT-ment",
  Salary:      "SA-la-ri",
  Colleague:   "KO-liig",
  Client:      "KLAI-ent",
  Create:      "kri-EIT",
  Achieve:     "a-CHIIV",
  Coordinate:  "kou-OO-di-neit",
  Deliver:     "di-LI-va",
  Support:     "sa-POOT",
  Analyze:     "A-na-laiz",

  // ── Workplace Abbreviations & Phrases (Module 5/6/7/8) ────────────────
  ASAP:        "ei-es-ei-pii",
  EOD:         "ii-ou-dii",
  FYI:         "ef-wai-ai",
  "Follow up": "FO-lou ap",
  "On board":  "on boo-rd",
  "Action item": "AK-shun AI-tem",
  "Touch base": "tuch beis",
  "Circle back": "SOO-kul bak",
  Bandwidth:   "BAND-width",
  Deliverable: "di-LI-va-bul",
  "How much":  "hau mach",
  "How many":  "hau ME-ni",

  // ── Module 8: Weather & Feelings ──────────────────────────────────────
  Sun:         "san",
  Rain:        "rein",
  Wind:        "wind",
  Cloud:       "klaud",
  Hot:         "hot",
  Cold:        "kould",
  Sunny:       "sani",
  Rainy:       "reini",
  Happy:       "hapi",
  Sad:         "sad",
  Hungry:      "hangri",
  Thirsty:     "thasti",
  Tired:       "taiyad",
  Excited:     "ik-SAI-tid",
  Stressed:    "strest",
  Calm:        "kam",

  // ── Module 9: Directions & Community ──────────────────────────────────
  Left:        "left",
  Right:       "rait",
  Straight:    "streit",
  Turn:        "tan",
  Near:        "nia",
  Far:         "fa",
  Corner:      "KOO-na",
  Cross:       "kros",
  Hospital:    "hospital",
  Bank:        "bank",
  School:      "skul",
  Market:      "maket",
  Restaurant:  "restoran",
  "Post Office": "pous ofis",
  Park:        "park",
  Street:      "strit",

  // ── Module 10: Introducing Yourself ───────────────────────────────────
  Name:        "neim",
  Developer:   "divelopa",
  Company:     "KOM-pa-ni",
  Passion:     "PA-shun",

  // ── Numbers ───────────────────────────────────────────────────────────
  One:         "wan",
  Two:         "twuu",
  Three:       "srii",
  Four:        "foo",
  Five:        "faiv",
  Six:         "siks",
  Seven:       "SE-ven",
  Eight:       "eit",
  Nine:        "nain",
  Ten:         "ten",
  Twenty:      "TWEN-ti",
  Thirty:      "THOO-ti",
  Forty:       "FOO-ti",
  Fifty:       "FIF-ti",
  Sixty:       "SIK-sti",
  Seventy:     "SE-ven-ti",
  Eighty:      "EI-ti",
  Ninety:      "NAIN-ti",
};

/**
 * Lookup phonetic for a word. Case-insensitive.
 * Returns the phonetic string or empty string if not found.
 */
export function getPhonetic(word: string): string {
  // Try exact, then title-cased
  return (
    PHONETICS[word] ??
    PHONETICS[word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()] ??
    ""
  );
}
