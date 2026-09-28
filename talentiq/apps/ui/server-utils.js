export function extractPublicSupabaseConfig(source) {
  const url = source.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i)?.[0];
  const namedKey = source.match(/(?:anon(?:ymous)?|publishable)[a-z0-9_]*\s*=\s*['"]([^'"]+)['"]/i)?.[1];
  const publishableKey = source.match(/\b(sb_publishable_[a-z0-9_-]+)\b/i)?.[1];
  const anonKey = namedKey ?? publishableKey;

  if (!url || !anonKey) throw new Error('Public Supabase configuration is unavailable.');

  return { url, anonKey };
}
