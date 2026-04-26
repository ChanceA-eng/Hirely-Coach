export type SavedResume = {
  text: string;
  fileName: string;
};

export type InterviewDraft = {
  resume: string;
  jobTitle: string;
  job: string;
  jobLink: string;
};

const SAVED_RESUME_KEY = "hirelySavedResume";
const INTERVIEW_DRAFT_KEY = "hirelyInterviewDraft";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadSavedResume(): SavedResume | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SAVED_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedResume>;
    if (!parsed.text) return null;
    return {
      text: parsed.text,
      fileName: parsed.fileName || "Saved resume",
    };
  } catch {
    return null;
  }
}

export function saveSavedResume(resume: SavedResume) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SAVED_RESUME_KEY, JSON.stringify(resume));
  } catch {
    // ignore storage failures
  }
}

export function clearSavedResume() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SAVED_RESUME_KEY);
}

export function loadInterviewDraft(): InterviewDraft | null {
  if (!isBrowser()) return null;

  const sessionResume = window.sessionStorage.getItem("interview_resume") || "";
  const sessionJobTitle = window.sessionStorage.getItem("interview_jobTitle") || "";
  const sessionJob = window.sessionStorage.getItem("interview_job") || "";
  const sessionJobLink = window.sessionStorage.getItem("interview_job_link") || "";

  if (sessionResume || sessionJobTitle || sessionJob || sessionJobLink) {
    return {
      resume: sessionResume,
      jobTitle: sessionJobTitle,
      job: sessionJob,
      jobLink: sessionJobLink,
    };
  }

  try {
    const raw = window.localStorage.getItem(INTERVIEW_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InterviewDraft>;
    return {
      resume: parsed.resume || "",
      jobTitle: parsed.jobTitle || "",
      job: parsed.job || "",
      jobLink: parsed.jobLink || "",
    };
  } catch {
    return null;
  }
}

export function saveInterviewDraft(draft: InterviewDraft) {
  if (!isBrowser()) return;

  window.sessionStorage.setItem("interview_resume", draft.resume);
  window.sessionStorage.setItem("interview_jobTitle", draft.jobTitle);
  window.sessionStorage.setItem("interview_job", draft.job);
  window.sessionStorage.setItem("interview_job_link", draft.jobLink);

  try {
    window.localStorage.setItem(INTERVIEW_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore storage failures
  }
}

export function clearInterviewDraft() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem("interview_resume");
  window.sessionStorage.removeItem("interview_jobTitle");
  window.sessionStorage.removeItem("interview_job");
  window.sessionStorage.removeItem("interview_job_link");
  window.localStorage.removeItem(INTERVIEW_DRAFT_KEY);
}