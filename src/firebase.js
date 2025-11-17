// Firebase has been removed from the client. Provide lightweight stubs
// so other modules that import `./firebase` keep working without bundling
// the Firebase SDK. The app uses `src/supabase.js` as the data source.

export const db = null;

export async function ensureAnonymousAuth() {
  // No-op in Supabase-only client; return null to indicate no Firebase user.
  return null;
}

export function getAuthState() {
  return null;
}

export function getProjectInfo() {
  return { projectId: null };
}
