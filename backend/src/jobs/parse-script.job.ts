import * as mupdf from 'mupdf';
import { supabaseAdmin } from '../config/supabase.js';

const SCRIPTS_BUCKET = 'scripts';

interface ParsedScript {
  text: string;
  pageCount: number | null;
}

/**
 * Thrown for inputs we understand but cannot handle, so the episode gets a
 * useful `parse_error` instead of a generic failure.
 */
class UnsupportedScriptError extends Error {}

/**
 * MuPDF rather than pdf-parse (pdf.js), because pdf.js could not resolve
 * Devanagari glyphs that are drawn away from their logical position — the
 * i-matra ि and the reph र्. It emitted NUL for each one, so कार्तिक reached the
 * database as कातक. MuPDF maps them correctly, which matters because those
 * names end up in promo copy.
 *
 * Synchronous and CPU-bound (it is WebAssembly), so it blocks the event loop
 * for the length of the parse. Fine while this job runs in-process on rare
 * manual uploads — see the note on `runParseScriptJob`.
 */
function parsePdf(bytes: Uint8Array): ParsedScript {
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf');
  try {
    const pageCount = doc.countPages();
    let text = '';
    for (let i = 0; i < pageCount; i += 1) {
      const page = doc.loadPage(i);
      try {
        // No options: 'preserve-whitespace' produced byte-identical output here.
        text += page.toStructuredText('').asText();
      } finally {
        page.destroy();
      }
    }
    return { text, pageCount };
  } finally {
    doc.destroy();
  }
}

function parsePlainText(bytes: Uint8Array): ParsedScript {
  return { text: new TextDecoder().decode(bytes), pageCount: null };
}

async function parseByMime(mime: string | null, bytes: Uint8Array): Promise<ParsedScript> {
  if (mime === 'application/pdf') return parsePdf(bytes);
  if (mime === 'text/plain') return parsePlainText(bytes);
  throw new UnsupportedScriptError(
    'Only PDF and plain text scripts can be parsed right now. Re-upload this episode as a PDF.',
  );
}

/**
 * PDF text extraction routinely emits NUL and other C0 control characters, which
 * Postgres `text` cannot store — it rejects the whole write with 22P05. Lone
 * surrogates break the JSON encoding on the way there, so they go too. Tab,
 * newline and carriage return are kept; they carry the script's layout.
 */
function sanitiseForPostgres(text: string): string {
  const TAB = 9;
  const LINE_FEED = 10;
  const CARRIAGE_RETURN = 13;
  const FIRST_PRINTABLE = 0x20;
  const SURROGATE_START = 0xd800;
  const SURROGATE_END = 0xdfff;

  const kept: string[] = [];
  // Iterating a string yields whole code points, so a valid surrogate pair
  // arrives as one character and only unpaired halves land in the range below.
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const isAllowedControl = code === TAB || code === LINE_FEED || code === CARRIAGE_RETURN;
    if (code < FIRST_PRINTABLE && !isAllowedControl) continue;
    if (code >= SURROGATE_START && code <= SURROGATE_END) continue;
    kept.push(char);
  }
  return kept.join('');
}

async function markFailed(episodeId: string, message: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('episodes')
    .update({ status: 'failed', parse_error: message })
    .eq('id', episodeId);

  if (error) {
    console.error('[parse-script] could not record failure', episodeId, error);
  }
}

/**
 * Downloads an episode's script from Storage, extracts its text, and moves the
 * row `uploaded → parsing → ready | failed`.
 *
 * Runs in-process with no queue: nothing retries, and a restart mid-parse leaves
 * the row stuck in `parsing`. Acceptable while uploads are manual and rare —
 * revisit if that changes.
 */
export async function runParseScriptJob(episodeId: string): Promise<void> {
  console.log(`[parse-script] ${episodeId} started`);
  try {
    const { data: episode, error: readError } = await supabaseAdmin
      .from('episodes')
      .select('id, script_path, script_mime')
      .eq('id', episodeId)
      .maybeSingle();

    if (readError || !episode) {
      console.error('[parse-script] episode not found', episodeId, readError);
      return;
    }
    if (!episode.script_path) {
      await markFailed(episodeId, 'No script file is attached to this episode.');
      return;
    }

    await supabaseAdmin
      .from('episodes')
      .update({ status: 'parsing', parse_error: null })
      .eq('id', episodeId);

    const { data: file, error: downloadError } = await supabaseAdmin.storage
      .from(SCRIPTS_BUCKET)
      .download(episode.script_path);

    if (downloadError || !file) {
      await markFailed(episodeId, 'Could not download the script from storage.');
      return;
    }

    console.log(`[parse-script] ${episodeId} downloaded, mime=${episode.script_mime ?? 'unknown'} — parsing`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = await parseByMime(episode.script_mime, bytes);
    const text = sanitiseForPostgres(parsed.text).trim();

    if (text.length === 0) {
      await markFailed(
        episodeId,
        'No text could be extracted. The file may be a scan rather than a text PDF.',
      );
      return;
    }

    const { error: writeError } = await supabaseAdmin
      .from('episodes')
      .update({
        extracted_text: text,
        page_count: parsed.pageCount,
        status: 'ready',
        parse_error: null,
      })
      .eq('id', episodeId);

    if (writeError) {
      console.error('[parse-script] save failed', episodeId, writeError);
      await markFailed(episodeId, 'Parsed the script but could not save the result.');
      return;
    }

    console.log(`[parse-script] ${episodeId} ready — ${text.length} chars, ${parsed.pageCount ?? '?'} pages`);
  } catch (err) {
    const message =
      err instanceof UnsupportedScriptError
        ? err.message
        : 'Could not read this script. It may be corrupt or password-protected.';
    console.error('[parse-script] failed', episodeId, err);
    await markFailed(episodeId, message);
  }
}
