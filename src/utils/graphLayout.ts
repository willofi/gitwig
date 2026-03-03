import { Commit } from '../types/git.types';

const COLORS = [
  "#58a6ff", "#3fb950", "#f78166", "#d2a8ff",
  "#ffa657", "#79c0ff", "#56d364", "#ff7b72",
  "#bc8cff", "#ffb77c",
];

const MAX_LANES = 12;

/**
 * Cache for processed commit results to avoid expensive re-calculations.
 */
let lastInputHash = "";
let lastResult: Commit[] = [];

/**
 * Extremely simplified graph processing to avoid UI freezing.
 * Only connects direct parents that are present in the current visible list.
 */
export function processCommitsForGraph(
  visibleCommits: Commit[]
): Commit[] {
  if (!visibleCommits || visibleCommits.length === 0) return [];

  // Generate a quick hash for the input list
  const inputHash = visibleCommits.length + (visibleCommits[0]?.hash || "") + (visibleCommits[visibleCommits.length - 1]?.hash || "");
  if (inputHash === lastInputHash) {
    return lastResult;
  }
  
  const visibleHashes = new Set(visibleCommits.map(c => c.hash));

  // 1. Assign lanes in a simple one-pass manner
  const processed = visibleCommits.map(c => ({
    ...c,
    // Only use parents that are immediately visible to avoid deep searching
    effectiveParents: (c.parents || []).filter(p => visibleHashes.has(p)),
    lanesIn: [] as (string | null)[],
    lanesOut: [] as (string | null)[],
    lane: 0,
    color: COLORS[0]
  }));

  const activeLanes: (string | null)[] = [];

  for (let i = 0; i < processed.length; i++) {
    const commit = processed[i];
    commit.lanesIn = [...activeLanes];

    let lane = activeLanes.indexOf(commit.hash);
    if (lane === -1) {
      lane = activeLanes.indexOf(null);
      if (lane === -1 || lane >= MAX_LANES) {
        lane = Math.min(activeLanes.length, MAX_LANES - 1);
        if (lane === activeLanes.length) activeLanes.push(commit.hash);
        else activeLanes[lane] = commit.hash;
      } else {
        activeLanes[lane] = commit.hash;
      }
    }
    commit.lane = lane;
    commit.color = COLORS[lane % COLORS.length];

    activeLanes[lane] = null;

    const parents = commit.effectiveParents;
    for (let j = 0; j < parents.length; j++) {
      const pHash = parents[j];
      if (activeLanes.indexOf(pHash) === -1) {
        const empty = activeLanes.indexOf(null);
        if (empty !== -1) activeLanes[empty] = pHash;
        else if (activeLanes.length < MAX_LANES) activeLanes.push(pHash);
      }
    }

    commit.lanesOut = [...activeLanes];
  }

  lastInputHash = inputHash;
  lastResult = processed;
  return processed;
}
