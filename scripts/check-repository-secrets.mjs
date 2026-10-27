import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const git = (cwd, args, input) => execFileSync('git', args, {
  cwd, input, maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
});

function privatePath(path) {
  const name = path.split('/').at(-1);
  return (/^\.env(?:\.|$)/.test(name) && !/^\.env\.(example|sample)$/.test(name)) ||
    /\.(env|secrets(?:\..*)?|pem|key|p12)$/.test(name) ||
    /^(staging-accounts|staging-secrets|auth-state|storage-state)(?:[.-]|$)/.test(name) ||
    /(^|\/)(artifacts|test-results|playwright-report|coverage|\.auth)\//.test(path) ||
    /^supabase\/\.(temp|branches)\//.test(path);
}

function credentialKind(text) {
  // Exact synthetic values used by negative authorization fixtures, not real keys.
  const placeholders = new Set(['sb_secret_external-placeholder', 'sb_secret_test-placeholder']);
  for (const match of text.matchAll(/sb_secret_[A-Za-z0-9_-]{20,}/g))
    if (!placeholders.has(match[0])) return 'Supabase secret key';
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const jwt = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      if (jwt.role === 'service_role' || (jwt.role === 'authenticated' && jwt.sub))
        return 'privileged or user-session JWT';
    } catch { /* Not a decodable JWT. */ }
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) return 'private key';
  if (/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})/.test(text)) return 'GitHub token';
  if (/AKIA[0-9A-Z]{16}/.test(text)) return 'AWS access key';
  if (/(?:postgres(?:ql)?|mysql):\/\/[^\s:/]+:[^\s@/]{8,}@/.test(text)) return 'database credential URL';
  return null;
}

/** Inspect indexed blobs, including force-added ignored files; never print file contents. */
export function scanGitIndex(cwd = process.cwd()) {
  const issues = [];
  const entries = git(cwd, ['ls-files', '--stage', '-z']).toString('utf8').split('\0').filter(Boolean).map((entry) => {
    const tab = entry.indexOf('\t');
    const [mode, oid, stage] = entry.slice(0, tab).split(' ');
    return { mode, oid, stage, path: entry.slice(tab + 1) };
  });
  for (const entry of entries) {
    if (privatePath(entry.path)) issues.push({ path: entry.path, reason: 'private environment/authentication/artifact path is tracked' });
    if (entry.stage !== '0') issues.push({ path: entry.path, reason: 'unresolved index conflict' });
  }
  const blobs = entries.filter((entry) => entry.mode !== '160000');
  if (!blobs.length) return issues;
  const data = git(cwd, ['cat-file', '--batch'], blobs.map((entry) => entry.oid).join('\n') + '\n');
  let offset = 0;
  for (const entry of blobs) {
    const end = data.indexOf(10, offset);
    const [oid, type, size] = data.subarray(offset, end).toString('utf8').split(' ');
    if (oid !== entry.oid || type !== 'blob' || !/^\d+$/.test(size)) throw new Error('Cannot inspect Git index blobs.');
    offset = end + 1;
    const bytes = data.subarray(offset, offset + Number(size));
    offset += Number(size) + 1;
    if (bytes.includes(0)) continue; // Binary artwork/fonts are not configuration text.
    const kind = credentialKind(bytes.toString('utf8'));
    if (kind) issues.push({ path: entry.path, reason: kind });
  }
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const issues = scanGitIndex();
    for (const issue of issues) console.error(`${issue.path}: ${issue.reason}`);
    if (issues.length) process.exitCode = 1;
    else console.log('Git index: no private configuration paths or recognized credential formats.');
  } catch {
    console.error('Unable to inspect the Git index; repository secret check failed closed.');
    process.exitCode = 1;
  }
}
