export type FoundationTemplateKey = "karibu" | "kikumbusho" | "hongera" | "taarifa";

export type FoundationTemplateInput = {
  name?: string;
  lessonNo?: string;
  moduleName?: string;
  points?: number;
  customTitle?: string;
  customBody?: string;
};

export type FoundationTemplateMessage = {
  subject: string;
  bodyText: string;
};

function fill(template: string, vars: Record<string, string | number | undefined>) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => String(vars[key] ?? ""));
}

export function foundationTemplateMessage(
  key: FoundationTemplateKey,
  input: FoundationTemplateInput = {}
): FoundationTemplateMessage {
  const vars = {
    name: input.name ?? "Mwanafunzi",
    lesson_no: input.lessonNo ?? "1",
    module_name: input.moduleName ?? "Moduli",
    points: input.points ?? 0,
  };

  if (key === "karibu") {
    return {
      subject: fill("Karibu kwenye Foundation, {{name}}!", vars),
      bodyText: fill(
        "Habari {{name}},\n\nSofia yuko tayari kuanza safari yako ya Kiingereza leo.\nTumekuandalia masomo rahisi ya kusikiliza, kuandika, na kutamka.\nAnza sasa ili ufikie malengo yako.\n\n[Anza Somo la Kwanza]",
        vars
      ),
    };
  }

  if (key === "kikumbusho") {
    return {
      subject: "Kikumbusho cha Foundation",
      bodyText: fill(
        "Sofia anakusubiri! Leo tunajifunza maneno mapya katika Somo la {{lesson_no}}. Chukua dakika 10 tu!",
        vars
      ),
    };
  }

  if (key === "hongera") {
    return {
      subject: "Hongera! Umefika hatua mpya.",
      bodyText: fill(
        "Umefanya vizuri sana! Umekamilisha Moduli ya {{module_name}} na kupata alama {{points}}.\nSofia amekufungulia masomo mapya ya kusisimua. Endelea hivi hivi!\n\n[Endelea na Masomo]",
        vars
      ),
    };
  }

  return {
    subject: input.customTitle?.trim() || "Taarifa mpya ya Foundation",
    bodyText:
      input.customBody?.trim() ||
      "Kuna taarifa mpya kwenye Foundation. Fungua app kuona ujumbe kamili.",
  };
}

export const FOUNDATION_DAILY_SCHEDULE_SW = [
  {
    day: "Mon-Fri",
    context: "Daily Habit",
    message: "Sofia anakusubiri! Leo tunajifunza maneno mapya katika Somo la {{lesson_no}}. Chukua dakika 10 tu!",
  },
  {
    day: "Saturday",
    context: "Review/Bonus XP",
    message: "Kazi nzuri wiki hii! Je, unataka alama (XP) zaidi? Rudia somo la jana uongeze ujuzi wako.",
  },
  {
    day: "Sunday",
    context: "Streak Saver",
    message: "Siku 6 mfululizo! Kamilisha zoezi moja fupi leo ili usivunje mlolongo wako wa mafanikio.",
  },
];
