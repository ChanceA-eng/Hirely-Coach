export type TargetingRecordLike = {
  job_title?: string;
  jobTitle?: string;
  title?: string;
};

export function getDisplayTitle(job: TargetingRecordLike | null | undefined): string {
  const raw = String(job?.job_title || job?.jobTitle || job?.title || "").trim();
  if (!raw) return "Analyzing Job...";
  if (/^https?:\/\//i.test(raw)) return "Analyzing Job...";
  return raw;
}
