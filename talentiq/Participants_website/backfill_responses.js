const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, serviceKey);
const storagePrefix = '/storage/v1/object/public/resumes/';

async function run() {
  let offset = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const { data: rows, error } = await supabase
      .from('responses')
      .select('id,resume_url,university,major')
      .order('id')
      .range(offset, offset + 99);

    if (error) throw error;
    if (!rows.length) break;

    for (const row of rows) {
      if (row.university && row.major) continue;

      let resumePath;
      try {
        const resumeUrl = new URL(row.resume_url);
        if (resumeUrl.origin !== new URL(supabaseUrl).origin || !resumeUrl.pathname.startsWith(storagePrefix)) {
          skipped++;
          continue;
        }
        resumePath = decodeURIComponent(resumeUrl.pathname.slice(storagePrefix.length));
      } catch {
        skipped++;
        continue;
      }

      const { data: file, error: fileError } = await supabase.storage.from('resumes').info(resumePath);
      if (fileError) throw fileError;

      const metadata = file.metadata || {};
      const changes = {};
      if (!row.university && typeof metadata.university === 'string' && metadata.university.trim()) {
        changes.university = metadata.university.trim();
      }
      if (!row.major && typeof metadata.major === 'string' && metadata.major.trim()) {
        changes.major = metadata.major.trim();
      }

      if (!Object.keys(changes).length) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase.from('responses').update(changes).eq('id', row.id);
      if (updateError) throw updateError;
      updated++;
    }

    offset += rows.length;
    if (rows.length < 100) break;
  }

  console.log(`Backfill complete: ${updated} responses updated, ${skipped} skipped.`);
}

run().catch(error => {
  console.error('Backfill failed:', error);
  process.exitCode = 1;
});
