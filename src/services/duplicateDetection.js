const Report = require('../models/Report');
const { textSimilarity, escapeRegex } = require('../utils/similarity');

const DUPLICATE_WINDOW_HOURS = 24;
const DUPLICATE_RADIUS_METERS = 250;

// Upgrade over the original client-only prototype: when GPS coordinates are
// available we use MongoDB's native $near on a 2dsphere index instead of a
// hand-rolled haversine loop. Falls back to a location-label match when a
// report only has a typed location (no GPS).
async function findDuplicates({ category, description, location, excludeId }) {
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 3600 * 1000);
  const baseFilter = {
    category,
    status: { $nin: ['resolved', 'closed'] },
    moderation: { $ne: 'rejected' },
    createdAt: { $gte: windowStart }
  };
  if (excludeId) baseFilter._id = { $ne: excludeId };

  let candidates = [];
  if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    candidates = await Report.find({
      ...baseFilter,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: location.coordinates },
          $maxDistance: DUPLICATE_RADIUS_METERS
        }
      }
    }).limit(20);
  } else if (location && location.label) {
    candidates = await Report.find({
      ...baseFilter,
      'location.label': new RegExp(escapeRegex(location.label.trim()), 'i')
    }).limit(20);
  }

  return candidates
    .map((r) => ({ report: r, score: textSimilarity(description, r.description) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.report);
}

module.exports = { findDuplicates, DUPLICATE_WINDOW_HOURS, DUPLICATE_RADIUS_METERS };
