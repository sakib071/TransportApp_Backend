// Ported from the original client-side prototype: Jaccard-style word-overlap
// score used to rank duplicate candidates once MongoDB has narrowed the field
// by category / time window / location.
function textSimilarity(a, b) {
  const norm = (s) => new Set(
    String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2)
  );
  const A = norm(a);
  const B = norm(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / Math.min(A.size, B.size);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { textSimilarity, escapeRegex };
