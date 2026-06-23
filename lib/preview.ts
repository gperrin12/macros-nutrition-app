/** True on Vercel preview deployments (branch/PR builds). */
export function isPreviewDeploy(): boolean {
  return process.env.VERCEL_ENV === "preview";
}
