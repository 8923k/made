// Pure computation core for the made path-finding feature.
// All functions are copied verbatim from Component.vue methods with `this.*`
// dependencies converted to explicit parameters, so they can run identically
// on the main thread and inside Web Workers.
// IMPORTANT: this module must stay behaviour-identical to the original
// implementation. Every optimization below is allocation / redundant-compute
// elimination only; no decision rule, ordering or output shape changes.

const MadeKeys = [];
const MadeKeyInfo = {};
const SymbolColorClass = { '+': 'track-red', '-': 'track-blue' };
const MadeFirstDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const MadeSecondDigits = ['1', '2', '3', '4', '5'];
for (let i = 0; i < MadeFirstDigits.length; i++) {
  const d1 = MadeFirstDigits[i];
  const maxPath = d1 === '0' ? 10 : Number(d1);
  for (let j = 0; j < MadeSecondDigits.length; j++) {
    const d2 = MadeSecondDigits[j];
    const base = d1 + d2;
    MadeKeys.push(base);
    MadeKeyInfo[base] = { leftCol: d1, rightCol: d2, value: Number(d2), maxPath, isEnhanced: false };
    const key = `[${base}]`;
    MadeKeys.push(key);
    MadeKeyInfo[key] = {
      leftCol: `[${d1}`,
      rightCol: `${d2}]`,
      value: Number(d2),
      maxPath,
      isEnhanced: true,
    };
  }
}

export { MadeKeys, MadeKeyInfo, SymbolColorClass };

export function handleResult(consts, index1, index2) {
  try {
    const compareNumberList = consts.compareNumberList;
    const constList = consts.constList;
    if (
      index1 == null ||
      index2 == null ||
      typeof index1 !== 'number' ||
      typeof index2 !== 'number' ||
      index1 < 0 ||
      index1 >= compareNumberList.length ||
      index2 >= compareNumberList.length
    ) {
      return [];
    }
    const val1 = compareNumberList[index1];
    const val2 = compareNumberList[index2];
    if (val1 == null || val2 == null) {
      return [];
    }
    const arr1 = String(val1).split('');
    const arr2 = String(val2).split('');
    const strNumberSet = new Set((arr1.join('') + arr2.join('')).split(''));
    return constList.filter((item) => !strNumberSet.has(item));
  } catch {
    return [];
  }
}

export function compareSign(consts, compareCache, digitIndex, selectedDigitIndex, isEnhanced = false) {
  const key = (isEnhanced ? 1 : 0) * 10000 + digitIndex * 100 + selectedDigitIndex;
  if (compareCache[key] == null) {
    const result = handleResult(consts, digitIndex, selectedDigitIndex);
    const diffLength = result.length;
    const mode = isEnhanced ? consts.compareModes.enhanced : consts.compareModes.normal;
    const inPositive = mode.positive.includes(diffLength);
    const inNegative = mode.negative.includes(diffLength);
    if (inPositive && !inNegative) {
      compareCache[key] = '-';
    } else if (inNegative && !inPositive) {
      compareCache[key] = '+';
    } else {
      compareCache[key] = '?';
    }
  }
  return compareCache[key];
}

export function validatePatternLength(patternLength) {
  return typeof patternLength === 'number' && Number.isInteger(patternLength) && patternLength > 0;
}

export function breaksPattern(patternLength, colorSeq) {
  const len = patternLength;
  if (!Number.isInteger(len) || len <= 0) return true;
  for (let i = len; i < colorSeq.length; i++) {
    if (colorSeq[i] !== colorSeq[i % len]) return true;
  }
  return false;
}

export function isPeriodicColors(patternLength, colorSeq) {
  if (!validatePatternLength(patternLength)) return false;
  if (colorSeq.length < patternLength) return false;
  return !breaksPattern(patternLength, colorSeq);
}

export function formatColumnTrack(stageCols, symbolSeq, colLabelFn) {
  if (!Array.isArray(stageCols) || stageCols.length === 0) return [];
  const total = stageCols.length;
  const formattedResult = [];
  let currentLine = [];
  let count = 0;
  for (let i = 0; i < total; i++) {
    const colIdx = stageCols[i];
    const digit = colLabelFn(colIdx);
    let colorClass = '';
    if (i === total - 1) {
      colorClass = 'track-black';
    } else if (i < symbolSeq.length) {
      const sym = symbolSeq[i];
      if (sym === '+') colorClass = 'track-red';
      else if (sym === '?') colorClass = 'track-gray';
      else if (sym === '-') colorClass = 'track-blue';
    }
    currentLine.push({ text: String(digit), colorClass });
    count++;
    const needNewline = count % 5 === 0;
    if (needNewline || i === total - 1) {
      if (currentLine.length > 0) {
        formattedResult.push(currentLine);
      }
      currentLine = [];
      if (i !== total - 1) {
        count = 0;
      }
    }
  }
  return formattedResult;
}

const columnLabel = (idx) => (idx + 1) % 10;
const EMPTY = 255;

/**
 * Flattens the 10 column arrays into a single Uint8Array (one cache-friendly
 * indexed load instead of a two-level array lookup in the DFS hot loop).
 * A missing / undefined value is stored as EMPTY, which mirrors the original
 * `v == null` checks exactly (digits only ever occupy 0..9).
 */
function buildFlatRows(arrList, totalRows) {
  const flat = new Uint8Array(10 * totalRows);
  for (let c = 0; c < 10; c++) {
    const col = arrList[c];
    const base = c * totalRows;
    if (!col) {
      flat.fill(EMPTY, base, base + totalRows);
      continue;
    }
    for (let i = 0; i < totalRows; i++) {
      const value = col[i];
      flat[base + i] = value == null ? EMPTY : value;
    }
  }
  return flat;
}

/**
 * Depth-first search for the best column path.
 *
 * `colorTable` maps digit -> sign char for this madeKey. compareSign's
 * documented contract is that it only ever returns '+', '-', or '?', so the
 * unreachable '0' guards of the original implementation are dropped.
 * `ring` is a reusable buffer for the periodicity check; the search is
 * strictly sequential, so sharing it is safe and removes per-node allocation.
 */
export function findBestPath(env, startCol, startRow, flat, stride, tabValue, isEnhanced, maxPath, rows, colorTable, ring) {
  const firstVal = flat[startCol * stride + startRow];
  if (firstVal === EMPTY) return null;
  let table = colorTable;
  if (table == null) {
    table = [];
    for (let v = 0; v <= 9; v++) {
      table[v] = compareSign(env.consts, env.compareCache, v, tabValue, isEnhanced);
    }
  }
  const firstColor = table[firstVal];
  const path = [startCol];
  let usedMask = 1 << startCol;
  const patternColors = firstColor === '?' ? [] : [firstColor];
  let bestPath = [startCol];
  let bestFullSymbolsLen = 1;
  const patternLength = env.patternLength;
  const ringSize = patternLength + 1;
  const buf = ring || new Array(ringSize);
  let lastFilteredCount = 0;

  const checkFullPath = (p) => {
    let filteredCount = 0;
    let count = 0;
    for (let r = 0; r < rows; r++) {
      const c = p[r % p.length];
      const v = flat[c * stride + startRow + r];
      if (v === EMPTY) continue;
      const color = table[v];
      filteredCount++;
      if (color === '?') continue;
      if (count >= patternLength && color !== buf[(count - patternLength) % ringSize]) {
        return false;
      }
      buf[count % ringSize] = color;
      count++;
    }
    if (count < patternLength) return false;
    lastFilteredCount = filteredCount;
    return true;
  };

  const dfs = (r) => {
    if (path.length >= maxPath) {
      if (checkFullPath(path) && lastFilteredCount > bestFullSymbolsLen) {
        bestPath = path.slice();
        bestFullSymbolsLen = lastFilteredCount;
        if (lastFilteredCount === rows) return true;
      }
      return false;
    }
    if (r >= rows) return false;
    if (bestFullSymbolsLen >= rows) return false;
    if (bestFullSymbolsLen >= maxPath && path.length + (rows - r) < maxPath) return false;
    const lastCol = path[path.length - 1];
    const nextRow = startRow + r;
    for (let step = 1; step <= 10; step++) {
      const c = (lastCol + step) % 10;
      const bit = 1 << c;
      if (usedMask & bit) continue;
      const v = flat[c * stride + nextRow];
      if (v === EMPTY) continue;
      const color = table[v];
      if (color !== '?') {
        const pcLen = patternColors.length;
        if (pcLen >= patternLength && color !== patternColors[pcLen % patternLength]) continue;
      }
      path.push(c);
      usedMask |= bit;
      if (color !== '?') patternColors.push(color);
      if (path.length > bestPath.length) {
        bestPath = path.slice();
      }
      const saturated = dfs(r + 1);
      path.pop();
      usedMask &= ~bit;
      if (color !== '?') patternColors.pop();
      if (saturated) return true;
    }
    return false;
  };

  dfs(1);
  return { path: bestPath, fullSymbolsLen: bestFullSymbolsLen };
}

/**
 * Builds the per-column result row for one starting row.
 *
 * Returns candidates carrying their raw track data (`_trackCols`, `_colorSeq`)
 * instead of the pre-formatted `formattedColumnTrack`. Formatting is deferred
 * to the ~10 winners in computeBestResult, which avoids building the render
 * structure for every discarded candidate along the way.
 */
export function computeRowForMade(env, madeKey, startRow, flat, stride, totalRows, skipCols, colorTable, ring) {
  try {
    const info = MadeKeyInfo[madeKey];
    if (!info) return [];
    const rows = totalRows - startRow;
    if (rows < 2) return Array(10).fill('-');
    const tabValue = info.value;
    const isEnhanced = info.isEnhanced;
    const maxPath = info.maxPath;
    let table = colorTable;
    if (table == null) {
      table = [];
      for (let v = 0; v <= 9; v++) {
        table[v] = compareSign(env.consts, env.compareCache, v, tabValue, isEnhanced);
      }
    }
    const row = [];
    for (let startCol = 0; startCol < 10; startCol++) {
      if (skipCols && skipCols[startCol]) {
        row[startCol] = '-';
        continue;
      }
      const best = findBestPath(env, startCol, startRow, flat, stride, tabValue, isEnhanced, maxPath, rows, table, ring);
      if (!best) {
        row[startCol] = '-';
        continue;
      }
      const path = best.path;
      const isFullPath = path.length === maxPath;
      const cols = [];
      const colorSeq = [];
      const filteredSeq = [];
      const redBlueSeq = [];
      let pmCount = 0;
      let qCount = 0;
      const steps = isFullPath ? rows : path.length;
      for (let r = 0; r < steps; r++) {
        const c = isFullPath ? path[r % path.length] : path[r];
        cols.push(c);
        const v = flat[c * stride + startRow + r];
        const sym = v === EMPTY ? '0' : table[v];
        colorSeq.push(sym);
        if (sym !== '0') {
          filteredSeq.push(sym);
          if (sym === '?') {
            qCount++;
          } else {
            pmCount++;
            redBlueSeq.push(sym);
          }
        }
      }
      if (!isPeriodicColors(env.patternLength, redBlueSeq)) {
        row[startCol] = '-';
        continue;
      }
      // The original `isPeriodicDigits(cols, maxPath)` guard is a tautology for
      // full paths: cols[r] === path[r % path.length] and path.length === maxPath,
      // so cols[r] === cols[r % maxPath] always holds. The `cols.length < period`
      // branch cannot trigger either, because a full path needs maxPath steps and
      // therefore rows >= maxPath. Removed as provably dead work.
      const fullSymbols = filteredSeq.join('');
      const symbols = [];
      let count = 0;
      for (let i = filteredSeq.length - 1; i >= 0 && count < 2; i--) {
        if (filteredSeq[i] !== '?') {
          symbols.unshift(filteredSeq[i]);
          count++;
        }
      }
      while (symbols.length < 2) {
        symbols.push('*');
      }
      const badgePm = pmCount + 1;
      const badgeCountVal = badgePm + qCount;
      const leftLabel = String(badgeCountVal);
      const rightCount = badgePm;
      let nextCol;
      if (isFullPath) {
        nextCol = path[rows % path.length];
      } else {
        const lastPathCol = path[path.length - 1];
        nextCol = lastPathCol;
        for (let step = 1; step <= 10; step++) {
          const candidate = (lastPathCol + step) % 10;
          if (path.indexOf(candidate) === -1) {
            nextCol = candidate;
            break;
          }
        }
      }
      const nextColDigit = columnLabel(nextCol);
      const merged = String(nextColDigit) + String(tabValue);
      const maybeBracketed = isEnhanced ? `[${merged}]` : merged;
      const s0 = symbols[0];
      const s1 = symbols[1];
      const trackCols = cols.concat([nextCol]);
      row[startCol] = {
        displaySegments: {
          leftLabel: leftLabel,
          sym0: s0,
          sym0Class: SymbolColorClass[s0] || '',
          middle: maybeBracketed,
          sym1: s1,
          sym1Class: SymbolColorClass[s1] || '',
          rightCount: rightCount,
        },
        fullSymbols: fullSymbols,
        isEffective: true,
        leftVal: badgeCountVal,
        rightVal: rightCount,
        _trackCols: trackCols,
        _colorSeq: colorSeq,
      };
    }
    return row;
  } catch {
    return [];
  }
}

// env = { consts, compareCache, patternLength }
export function computeBestResult(env, madeKey, arrList) {
  try {
    const info = MadeKeyInfo[madeKey];
    if (!info) {
      return Array(10).fill('-');
    }
    const totalRows = arrList.length ? arrList[0].length : 0;
    if (totalRows < 2 || !validatePatternLength(env.patternLength)) {
      return Array(10).fill('-');
    }
    const colorTable = [];
    for (let v = 0; v <= 9; v++) {
      colorTable[v] = compareSign(env.consts, env.compareCache, v, info.value, info.isEnhanced);
    }
    const flat = buildFlatRows(arrList, totalRows);
    const ring = new Array(env.patternLength + 1);
    const bestResults = Array(10).fill(null);
    const bestCounts = Array(10).fill(0);
    const saturated = Array(10).fill(false);
    let remaining = 10;
    for (let startRow = 0; startRow <= totalRows - 2; startRow++) {
      if (remaining === 0) break;
      const rows = totalRows - startRow;
      const currentResult = computeRowForMade(
        env, madeKey, startRow, flat, totalRows, totalRows, saturated, colorTable, ring
      );
      for (let col = 0; col < 10; col++) {
        if (saturated[col]) continue;
        const currentValue = currentResult[col];
        if (
          currentValue &&
          currentValue !== '-' &&
          typeof currentValue === 'object' &&
          currentValue.isEffective
        ) {
          const currentCount = currentValue.fullSymbols.length;
          if (currentCount > bestCounts[col]) {
            bestResults[col] = currentValue;
            bestCounts[col] = currentCount;
          }
          if (currentCount === rows) {
            saturated[col] = true;
            remaining--;
          }
        }
      }
    }
    return bestResults.map((result) => {
      if (!result) return '-';
      return {
        displaySegments: result.displaySegments,
        fullSymbols: result.fullSymbols,
        formattedColumnTrack: formatColumnTrack(result._trackCols, result._colorSeq, columnLabel),
        isEffective: result.isEffective,
        leftVal: result.leftVal,
        rightVal: result.rightVal,
      };
    });
  } catch {
    return Array(10).fill('-');
  }
}

export function getTableArrList(showNumberList) {
  if (!Array.isArray(showNumberList) || showNumberList.length === 0) {
    return [];
  }
  const arrList = [];
  for (let col = 0; col < 10; col++) {
    const arr = [];
    for (let row = showNumberList.length - 1; row >= 0; row--) {
      arr.push(
        showNumberList[row] && showNumberList[row][col] !== undefined
          ? showNumberList[row][col]
          : null
      );
    }
    arrList.push(arr);
  }
  return arrList;
}
