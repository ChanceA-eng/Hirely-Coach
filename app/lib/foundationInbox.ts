export type FoundationInboxCategory = "alerts" | "inbox" | "updates";

export type FoundationInboxPayload = {
  title: string;
  body: string;
  data: {
    screen: "LessonView" | "VideoPlayer";
    params: Record<string, string | number | boolean>;
  };
  sound: "default";
  priority: "high" | "normal";
};

export type FoundationInboxItem = {
  id: string;
  title: string;
  body: string;
  category: FoundationInboxCategory;
  href: string;
  createdAt: number;
  read: boolean;
  payload: FoundationInboxPayload;
};

export type FoundationInboxState = {
  notifications: FoundationInboxItem[];
};

const MAX_ITEMS = 120;
const CAREER_JARGON = /\b(job|boss|company|salary)\b/i;

function toSafeInt(value: unknown): number {
  const num = Math.floor(Number(value ?? 0));
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

export function containsCareerJargon(value: string): boolean {
  return CAREER_JARGON.test(value);
}

export function assertNoCareerJargon(...values: string[]) {
  if (values.some((value) => containsCareerJargon(value))) {
    throw new Error("Foundation Mode messages cannot mention job, boss, company, or salary.");
  }
}

export function createFoundationInboxItem(
  partial: Omit<FoundationInboxItem, "id" | "createdAt" | "read">,
  now = Date.now()
): FoundationInboxItem {
  assertNoCareerJargon(partial.title, partial.body);
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now,
    read: false,
    ...partial,
  };
}

export function normalizeFoundationInboxState(input: unknown): FoundationInboxState {
  const row = (input ?? {}) as Record<string, unknown>;
  const notifications = Array.isArray(row.notifications) ? row.notifications : [];

  return {
    notifications: notifications
      .map((entry) => {
        const item = (entry ?? {}) as Record<string, unknown>;
        const title = String(item.title ?? "").trim();
        const body = String(item.body ?? "").trim();
        const href = String(item.href ?? "").trim();
        const rawCategory = String(item.category ?? "").toLowerCase();
        const category =
          rawCategory === "alerts" || rawCategory === "inbox" || rawCategory === "updates"
            ? (rawCategory as FoundationInboxCategory)
            : rawCategory === "tip"
              ? "inbox"
              : rawCategory === "badge" || rawCategory === "video"
                ? "updates"
                : "alerts";
        const payloadRow = (item.payload ?? {}) as Record<string, unknown>;
        const dataRow = (payloadRow.data ?? {}) as Record<string, unknown>;
        const paramsRow = (dataRow.params ?? {}) as Record<string, unknown>;

        if (!title || !body || !href) return null;
        if (containsCareerJargon(title) || containsCareerJargon(body)) return null;

        return {
          id: String(item.id ?? "").trim() || `${title}-${href}`,
          title,
          body,
          category,
          href,
          createdAt: toSafeInt(item.createdAt),
          read: Boolean(item.read),
          payload: {
            title: String(payloadRow.title ?? title),
            body: String(payloadRow.body ?? body),
            data: {
              screen: dataRow.screen === "VideoPlayer" ? "VideoPlayer" : "LessonView",
              params: Object.fromEntries(
                Object.entries(paramsRow).map(([key, value]) => [key, typeof value === "boolean" ? value : String(value)])
              ),
            },
            sound: "default",
            priority: payloadRow.priority === "normal" ? "normal" : "high",
          },
        } satisfies FoundationInboxItem;
      })
      .filter(Boolean)
      .slice(0, MAX_ITEMS) as FoundationInboxItem[],
  };
}

export function appendFoundationInboxItem(
  existing: FoundationInboxItem[],
  incoming: FoundationInboxItem
): FoundationInboxItem[] {
  return [incoming, ...existing]
    .filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.title === item.title &&
            candidate.body === item.body &&
            candidate.href === item.href
        ) === index
    )
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, MAX_ITEMS);
}

export function unreadFoundationInboxCount(items: FoundationInboxItem[]): number {
  return items.filter((item) => !item.read).length;
}

export function buildFoundationSofiaTip(lessonId = 13): FoundationInboxItem {
  return createFoundationInboxItem({
    title: "Sofia's Tip",
    body: `Umekumbuka? Herufi 'H' katika 'Head' inatamkwa kwa nguvu. Jaribu tena katika Somo la ${lessonId}!`,
    category: "inbox",
    href: `/foundation/lesson/6/6-1?focus=typing&lesson=${lessonId}`,
    payload: {
      title: "Sofia's Tip",
      body: `Umekumbuka? Herufi 'H' katika 'Head' inatamkwa kwa nguvu. Jaribu tena katika Somo la ${lessonId}!`,
      data: {
        screen: "LessonView",
        params: { lesson_id: lessonId, focus: "typing" },
      },
      sound: "default",
      priority: "high",
    },
  });
}

export function buildFoundationMilestone(moduleNum: number): FoundationInboxItem {
  const body = moduleNum >= 6
    ? "Umemaliza nusu ya masomo! Bado hatua chache tu umalize misingi yote."
    : "Hongera! Masomo mapya yamefunguliwa. Gusa hapa uyaone. 🔓";

  return createFoundationInboxItem({
    title: "Milestone",
    body,
    category: "inbox",
    href: `/foundation/lesson/${moduleNum}/${moduleNum}-1`,
    payload: {
      title: "Lesson Unlock",
      body: "Sofia is ready for the next step!",
      data: {
        screen: "LessonView",
        params: { lesson_id: `${moduleNum}-1`, module: moduleNum },
      },
      sound: "default",
      priority: "high",
    },
  });
}

export function buildFoundationVideoUpdate(moduleNum: number): FoundationInboxItem {
  const body = `Video ya Somo la ${moduleNum} sasa ipo hewani. Itazame kabla ya kufanya mazoezi ya sauti.`;
  return createFoundationInboxItem({
    title: "Video Update",
    body,
    category: "updates",
    href: `/foundation?video=${moduleNum}`,
    payload: {
      title: "New Video",
      body: "New video added! Watch to see how to pronounce the words. 🎬",
      data: {
        screen: "VideoPlayer",
        params: { module: moduleNum },
      },
      sound: "default",
      priority: "high",
    },
  });
}