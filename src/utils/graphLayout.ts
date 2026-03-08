import { Commit } from '../types/git.types';

const COLORS = [
  "#58a6ff", "#3fb950", "#f78166", "#d2a8ff",
  "#ffa657", "#79c0ff", "#56d364", "#ff7b72",
  "#bc8cff", "#ffb77c",
];

// 20으로 높여 복잡한 레포에서 overflow 방지
const MAX_LANES = 20;

let lastInputHash = "";
let lastResult: Commit[] = [];

/**
 * 커밋 목록에 SVG 그래프 렌더링용 lane/color/lanesIn/lanesOut 데이터를 계산한다.
 *
 * activeLanes[i] = 슬롯 i에서 "아래에 나타날 것으로 기대되는 커밋 해시"
 *                  null = 빈 슬롯
 *
 * lanesIn  : 이 행의 위쪽 절반에서 어떤 선이 들어오는지 (처리 전 스냅샷)
 * lanesOut : 이 행의 아래쪽 절반에서 어떤 선이 나가는지 (처리 후 스냅샷)
 *
 * GraphSVG 렌더링 규칙:
 *   Incoming (top→midY):
 *     hash === commit.hash  → nodeX 로 수렴
 *     그 외                 → lanesOut 내 같은 hash 위치로 (통과/대각선)
 *                             lanesOut 에도 없으면 → 그냥 끊김 (nodeX 아님)
 *   Outgoing (midY→bottom):
 *     lanesOut 의 각 hash:
 *       lanesIn 에 있었다면   → lanesIn 내 위치에서 출발 (통과)
 *       lanesIn 에 없었다면   → nodeX 에서 출발 (새 부모)
 *     effectiveParents 중 이미 lanesIn 에서 추적 중인 것:
 *       → nodeX 에서 출발해 lanesOut 내 위치로 추가 호 (연결선)
 */
export function processCommitsForGraph(visibleCommits: Commit[]): Commit[] {
  if (!visibleCommits || visibleCommits.length === 0) return [];

  // 캐시 키: 길이 + 앞/중간/끝 해시 조합 (단순 첫/끝만 쓰면 충돌 가능)
  const mid = Math.floor(visibleCommits.length / 2);
  const inputHash =
    visibleCommits.length + '|' +
    (visibleCommits[0]?.hash ?? '') + '|' +
    (visibleCommits[mid]?.hash ?? '') + '|' +
    (visibleCommits[visibleCommits.length - 1]?.hash ?? '');
  if (inputHash === lastInputHash) return lastResult;

  const visibleHashes = new Set(visibleCommits.map(c => c.hash));

  const processed = visibleCommits.map(c => ({
    ...c,
    effectiveParents: (c.parents || []).filter(p => visibleHashes.has(p)),
    lanesIn: [] as (string | null)[],
    lanesOut: [] as (string | null)[],
    lane: 0,
    color: COLORS[0],
  }));

  const activeLanes: (string | null)[] = [];

  /** activeLanes 내 첫 번째 null 슬롯 인덱스를 반환. 없으면 -1 */
  function findFreeSlot(): number {
    for (let k = 0; k < activeLanes.length && k < MAX_LANES; k++) {
      if (activeLanes[k] === null) return k;
    }
    return -1;
  }

  for (let i = 0; i < processed.length; i++) {
    const commit = processed[i];

    // ── 1. lanesIn 스냅샷 ──────────────────────────────────────────────────
    commit.lanesIn = activeLanes.slice();

    // ── 2. 이 커밋의 레인 확정 ────────────────────────────────────────────
    let lane = activeLanes.indexOf(commit.hash);

    if (lane === -1) {
      // 브랜치 팁(아직 추적 안 된 커밋): 빈 슬롯 재사용 또는 확장
      const free = findFreeSlot();
      if (free !== -1) {
        lane = free;
      } else if (activeLanes.length < MAX_LANES) {
        lane = activeLanes.length;
        activeLanes.push(null);
      } else {
        // MAX_LANES 초과: 마지막 슬롯 재사용 (기존 값은 잃지만 덮어쓰지 않도록
        // 이미 null인 경우에만 사용; 꽉 찬 경우는 그냥 마지막 레인 사용)
        lane = MAX_LANES - 1;
      }
    }

    commit.lane = lane;
    commit.color = COLORS[lane % COLORS.length];

    // ── 3. 이 커밋의 슬롯 해제 ────────────────────────────────────────────
    activeLanes[lane] = null;

    // ── 4. 부모들을 슬롯에 배치 ───────────────────────────────────────────
    // j=0 (첫 번째 부모): 방금 비운 슬롯(lane)을 우선 사용 → 직선 유지
    // j>0 (추가 부모, merge): 다음 빈 슬롯 또는 확장
    const parents = commit.effectiveParents;
    for (let j = 0; j < parents.length; j++) {
      const pHash = parents[j];
      if (activeLanes.indexOf(pHash) !== -1) continue; // 이미 추적 중

      let target: number;
      if (j === 0) {
        // 방금 비운 슬롯은 null이므로 그대로 사용
        target = lane;
      } else {
        target = findFreeSlot();
        if (target === -1) {
          if (activeLanes.length < MAX_LANES) {
            target = activeLanes.length;
            activeLanes.push(null);
          } else {
            // MAX_LANES 초과 → 이 부모는 추적 포기 (기존 슬롯 덮어쓰지 않음)
            continue;
          }
        }
      }
      activeLanes[target] = pHash;
    }

    // ── 5. lanesOut 스냅샷 ──────────────────────────────────────────────────
    commit.lanesOut = activeLanes.slice();
  }

  lastInputHash = inputHash;
  lastResult = processed;
  return processed;
}
