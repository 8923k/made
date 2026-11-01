<template>
  <div class="my-component-container">
    <el-card shadow="never" class="result-card">
      <div class="result-grid">
        <div
          v-for="(item, idx) in resultTenItems"
          :key="idx"
          class="result-cell"
          :class="{ 'result-cell-highlight': isMaxCount(item) }"
        >
          <div class="result-container">
            <span
              v-if="item && item !== '-'"
              class="valueCol main-result"
            >
              <template
                v-if="
                  typeof item === 'object' &&
                  item.displaySegments
                "
              >{{
                  item.displaySegments.leftLabel
                }}<span :class="item.displaySegments.sym0Class">{{
                  item.displaySegments.sym0
                }}</span>{{
                  item.displaySegments.middle
                }}<span :class="item.displaySegments.sym1Class">{{
                  item.displaySegments.sym1
                }}</span>{{ item.displaySegments.rightCount }}</template>
              <template v-else>
                {{ item }}
              </template>
            </span>
            <span v-else>-</span>
            <template
              v-if="
                showSubResults &&
                item &&
                item !== '-' &&
                typeof item === 'object'
              "
            >
              <span class="valueCol sub-result"><span
                  v-for="(segments, lineIndex) in item.formattedColumnTrack"
                  :key="lineIndex"
                ><span v-for="(segment, segmentIndex) in segments" :key="segmentIndex" :class="segment.colorClass">{{ segment.text }}</span><br
                    v-if="
                      lineIndex < item.formattedColumnTrack.length - 1
                    "
                  /></span></span>
            </template>
          </div>
        </div>
      </div>
    </el-card>
    <el-card shadow="never" class="tabs-card">
      <div ref="tabWindow" class="tab-window">
        <div
          v-for="item in displayTabItems"
          :key="item.key"
          class="tab-cell"
          :class="{ 'tab-cell-active': !item.isPlaceholder && item.key === selectedMadeKey, 'tab-cell-placeholder': item.isPlaceholder }"
          @click="!item.isPlaceholder && (selectedMadeKey = item.key)"
        >
          <div class="tab-cross">
            <span class="tab-cross-item tab-cross-top">{{ item.highlightLeft }}</span>
            <span class="tab-cross-item tab-cross-right">{{ item.rightCol }}</span>
            <span class="tab-cross-item tab-cross-bottom">{{ item.highlightRight }}</span>
            <span class="tab-cross-item tab-cross-left">{{ item.leftCol }}</span>
          </div>
        </div>
      </div>
    </el-card>
    <el-card shadow="never" class="input-card">
      <el-form ref="form" :model="formData" @submit.prevent>
        <el-form-item
          prop="addNumber"
          :show-message="false"
          :rules="[
            { required: true },
            { pattern: /^[0-9]{10}$/ },
          ]"
        >
          <div class="input-row">
            <el-input
              v-model="formData.addNumber"
              type="text"
              maxlength="10"
              size="small"
              autocomplete="off"
              inputmode="numeric"
              @input="filterDigits"
              @blur="handleInputBlur"
              @keyup.enter="handleInputEnter"
            ></el-input>
            <div class="btn-group">
              <el-button
                size="small"
                type="danger"
                class="action-btn"
                @click="clearAll"
              >
                Clr
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never" class="number-list-card">
      <div class="show-number-list">
        <ul>
          <li v-for="(list, index) in displayNumberList" :key="index" class="row">
            <span v-for="(item, idx) in list" :key="idx" class="column-item" :class="{ 'column-item-placeholder': item === '-' }">{{ item }}</span>
            <el-button
              size="small"
              type="danger"
              class="action-btn"
              @click="deleteItem(index)"
            >
              Del
            </el-button>
          </li>
        </ul>
      </div>
    </el-card>
  </div>
</template>

<script>
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
  export default {
    data() {
      return {
        formData: { addNumber: '' },
        madeResults: {},
        compareCache: {},
        highlightCriterionCache: {},
        selectedMadeKey: '11',
        compareNumberList: [12890, 12390, 12340, 12345, 23456, 34567, 45678, 56789, 67890, 17890],
        constList: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        lengthLimit: 60,
        showSubResults: true,
        tabConfig: {
          compare: 'r_+_+', // 'l'/'r' _ '+'/'-' _ '+'/'-'
          sortOrder: 'desc', // 'default', 'desc', 'asc'
          selection: 'max', // 'user', 'max', 'min'
        },
        patternLength: 2,
        compareModes: {
          normal: {
            positive: [1, 2],
            negative: [3, 4],
          },
          enhanced: {
            positive: [2, 3],
            negative: [1, 4],
          }
        },
        showNumberList: [
          /*
          4375920168
          6802375491
          0459687123
          2167059483
          9587642301
          6150234798
          3140298756
          4261975308
          5631092487
          6931042875
          7841056392
          2608153497
          0431782965
          5237469801
          3804925617
          2715683409
          7541328960
          3204567918
          9725146083
          5241873960
          8315792046
          0678941253
          8754302196
          9816374052
          1894723056
          6230784519
          9685371042
          7960312845
          5849216703
          8053294167
          1645872093
          4056327981
          4129086573
          4371865902
          0952183746
          4205163978
          1935824607
          8142579063
          7938610524
          9172350486
          7534801926
          3869057214
          3701459862
          5314862097
          2948367510
          6724835091
          2835107946
          6835421709
          1302798645
          4132809657
          7201348965
          7542813690
          0645271893
          8462701539
          7985304612
          3902846715
          8465301297
          7952418036
          0815473269
          4580169327
          8341695207
          4836957012
          7405298316
          1956842037
          4578912603
          3790286154
          0163497852
          4132095687
          7219653048
          7153064289
          0891527436
          3021694875
          3976014285
          5869423701
          6058371492
          2517340986
          6721043589
          2594836710
          1840562739
          5478923610
          9265734018
          7348902615
          8613279450
          8950461273
          0947312658
          4108592673
          3061247895
          0875196324
          0923146785
          5608197432
          8251436709
          8513472096
          6298147053
          8743510269
          6930851274
          1480739526
          0594613278
          4627901835
          6298401357
          0947623158
          6749158230 // 20
          0581472936
          6820159473 // 18
          1543689270
          0918435627 // 16
          5840136279
          2954803617 // 14
          2761340958
          3021578946 // 12
          9471608325
          2103857649 // 10
          0394182576
          3608291745 // 8
          3581647029
          1596732804 // 6
          3890157264
          8046359271 // 4
          9871452306
          4715692038 // 2
          9326750481
          */
          // [6, 7, 4, 9, 1, 5, 8, 2, 3, 0], // 20
          // [0, 5, 8, 1, 4, 7, 2, 9, 3, 6],
          // [6, 8, 2, 0, 1, 5, 9, 4, 7, 3], // 18
          // [1, 5, 4, 3, 6, 8, 9, 2, 7, 0],
          // [0, 9, 1, 8, 4, 3, 5, 6, 2, 7], // 16
          // [5, 8, 4, 0, 1, 3, 6, 2, 7, 9],
          // [2, 9, 5, 4, 8, 0, 3, 6, 1, 7], // 14
          // [2, 7, 6, 1, 3, 4, 0, 9, 5, 8],
          // [3, 0, 2, 1, 5, 7, 8, 9, 4, 6], // 12
          // [9, 4, 7, 1, 6, 0, 8, 3, 2, 5],
          // [2, 1, 0, 3, 8, 5, 7, 6, 4, 9], // 10
          // [0, 3, 9, 4, 1, 8, 2, 5, 7, 6],
          // [3, 6, 0, 8, 2, 9, 1, 7, 4, 5], // 8
          // [3, 5, 8, 1, 6, 4, 7, 0, 2, 9],
          // [1, 5, 9, 6, 7, 3, 2, 8, 0, 4], // 6
          // [3, 8, 9, 0, 1, 5, 7, 2, 6, 4],
          // [8, 0, 4, 6, 3, 5, 9, 2, 7, 1], // 4
          // [9, 8, 7, 1, 4, 5, 2, 3, 0, 6],
          // [4, 7, 1, 5, 6, 9, 2, 0, 3, 8], // 2
          // [9, 3, 2, 6, 7, 5, 0, 4, 8, 1],
        ],
      };
    },
    computed: {
      compareParts() {
        const p = this.tabConfig.compare.split('_');
        return { isLeft: p[0] === 'l', pIsMax: p[1] === '+', sIsMax: p[2] === '+' };
      },
      madeTabStats() {
        const stats = [];
        for (let i = 0; i < MadeKeys.length; i++) {
          const key = MadeKeys[i];
          const items = this.getItemsForMade(key);
          let leftVal = 0;
          let rightVal = 0;
          let highlightItem = null;
          if (items.length > 0) {
            const picked = this.pickHighlightCriterion(items);
            if (picked.item) {
              highlightItem = picked.item;
              leftVal = picked.item.leftVal;
              rightVal = picked.item.rightVal;
            }
          }
          stats.push({
            key: key,
            leftVal: leftVal,
            rightVal: rightVal,
            isValid: items.length > 0,
            highlightItem: highlightItem,
            origIdx: i,
          });
        }
        return stats;
      },
      hasAnyValidMade() {
        return this.madeTabStats.some((stat) => stat.isValid);
      },
      sortedMadeStats() {
        const ordered = this.madeTabStats.slice();
        if (this.tabConfig.sortOrder !== 'default') {
          const order = this.tabConfig.sortOrder === 'asc' ? 1 : -1;
          const byLeft = this.compareParts.isLeft;
          ordered.sort((a, b) => {
            const ap = byLeft ? a.leftVal : a.rightVal;
            const bp = byLeft ? b.leftVal : b.rightVal;
            if (ap !== bp) return (ap - bp) * order;
            const as = byLeft ? a.rightVal : a.leftVal;
            const bs = byLeft ? b.rightVal : b.leftVal;
            if (as !== bs) return (as - bs) * order;
            return a.origIdx - b.origIdx;
          });
        }
        return ordered;
      },
      visibleMadeKeys() {
        return this.sortedMadeStats.map((stat) => stat.key);
      },
      displayTabItems() {
        const stats = this.sortedMadeStats;
        if (!this.hasAnyValidMade) {
          const out = new Array(stats.length);
          for (let i = 0; i < stats.length; i++) {
            out[i] = {
              key: `placeholder-${i}`,
              isPlaceholder: true,
              highlightLeft: '-',
              rightCol: '-',
              highlightRight: '-',
              leftCol: '-',
            };
          }
          return out;
        }
        const out = new Array(stats.length);
        for (let i = 0; i < stats.length; i++) {
          const stat = stats[i];
          const info = MadeKeyInfo[stat.key];
          const seg = stat.highlightItem && stat.highlightItem.displaySegments;
          out[i] = {
            key: stat.key,
            isPlaceholder: false,
            highlightLeft: seg ? seg.leftLabel : '',
            rightCol: info.rightCol,
            highlightRight: seg ? seg.rightCount : '',
            leftCol: info.leftCol,
          };
        }
        return out;
      },
      resultTenItems() {
        const items = (this.madeResults[this.selectedMadeKey] || []).slice(0, 10);
        while (items.length < 10) {
          items.push('-');
        }
        return items;
      },
      displayNumberList() {
        if (this.showNumberList.length > 0) {
          return this.showNumberList;
        }
        return [Array(10).fill('-')];
      },
    },
    watch: {
      visibleMadeKeys(newVal) {
        if (!newVal || newVal.length === 0 || !this.hasAnyValidMade) return;
        this.highlightCriterionCache = {};
        const selection = this.tabConfig.selection;
        let targetKey = newVal[0];
        if (
          selection === 'user' &&
          this.selectedMadeKey &&
          newVal.includes(this.selectedMadeKey)
        ) {
          this.$nextTick(() => this.centerActiveTab());
          return;
        }
        const byLeft = this.compareParts.isLeft;
        if (selection === 'max' || selection === 'min') {
          const isMax = selection === 'max';
          const stats = this.sortedMadeStats;
          let bestKey = targetKey;
          let bestPrimary = isMax ? -Infinity : Infinity;
          let bestSecondary = isMax ? -Infinity : Infinity;
          for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            if (!stat.isValid) continue;
            const primary = byLeft ? stat.leftVal : stat.rightVal;
            const secondary = byLeft ? stat.rightVal : stat.leftVal;
            const better = isMax
              ? primary > bestPrimary || (primary === bestPrimary && secondary > bestSecondary)
              : primary < bestPrimary || (primary === bestPrimary && secondary < bestSecondary);
            if (better) {
              bestPrimary = primary;
              bestSecondary = secondary;
              bestKey = stat.key;
            }
          }
          targetKey = bestKey;
        }
        this.selectedMadeKey = targetKey;
        this.$nextTick(() => this.centerActiveTab());
      },
      selectedMadeKey(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.highlightCriterionCache = {};
          this.$nextTick(() => this.centerActiveTab());
        }
      },
    },
    mounted() {
      this.handleAddNumber();
    },
    methods: {
      centerActiveTab() {
        const el = this.$refs.tabWindow;
        if (!el) return;
        const cell = el.querySelector('.tab-cell-active');
        if (!cell) return;
        const w = el.clientWidth;
        const target = cell.offsetLeft - w / 2 + cell.offsetWidth / 2;
        el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      },
      formatColumnTrack(stageCols, symbolSeq, colLabelFn) {
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
            colorClass = '';
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
      },
      isMaxCount(item) {
        if (!item || item === '-' || typeof item !== 'object') return false;
        if (!item.fullSymbols) {
          return false;
        }
        const currentLeftVal = item.leftVal;
        const currentRightVal = item.rightVal;
        const cacheKey = this.selectedMadeKey + '|' + this.tabConfig.compare;
        let criterion = this.highlightCriterionCache && this.highlightCriterionCache[cacheKey];
        if (!criterion) {
          if (!this.highlightCriterionCache) this.highlightCriterionCache = {};
          const allItems = this.getItemsForHighlight();
          if (allItems.length === 0) return false;
          criterion = this.pickHighlightCriterion(allItems);
          this.highlightCriterionCache[cacheKey] = criterion;
        }
        const primaryIsLeft = this.compareParts.isLeft;
        const currentPrimary = primaryIsLeft ? currentLeftVal : currentRightVal;
        const currentSecondary = primaryIsLeft ? currentRightVal : currentLeftVal;
        return currentPrimary === criterion.primary && currentSecondary === criterion.secondary;
      },
      pickHighlightCriterion(allItems) {
        const { isLeft: primaryIsLeft, pIsMax, sIsMax } = this.compareParts;
        let primary = pIsMax ? -Infinity : Infinity;
        for (let i = 0; i < allItems.length; i++) {
          const v = primaryIsLeft ? allItems[i].leftVal : allItems[i].rightVal;
          if (pIsMax ? v > primary : v < primary) primary = v;
        }
        let secondary = sIsMax ? -Infinity : Infinity;
        let pick = null;
        for (let i = 0; i < allItems.length; i++) {
          const it = allItems[i];
          const pv = primaryIsLeft ? it.leftVal : it.rightVal;
          if (pv !== primary) continue;
          const sv = primaryIsLeft ? it.rightVal : it.leftVal;
          if (sIsMax ? sv > secondary : sv < secondary) {
            secondary = sv;
            pick = it;
          }
        }
        return { primary: primary, secondary: secondary, item: pick };
      },
      getItemsForHighlight() {
        return this.getItemsForMade(this.selectedMadeKey);
      },
      validateNumber(val) {
        const trimmed = String(val || '').trim();
        const isTenDigits = /^[0-9]{10}$/.test(trimmed);
        const isUnique = new Set(trimmed.split('')).size === 10;
        if (!isTenDigits || !isUnique) {
          return { valid: false };
        }
        const exists = this.showNumberList.some((row) => row.join('') === trimmed);
        if (exists) {
          return { valid: false };
        }
        return { valid: true };
      },
      tryAddCurrentInput() {
        this.$refs.form.validate((valid) => {
          if (!valid) return;
          const validation = this.validateNumber(this.formData.addNumber);
          if (!validation.valid) return;
          this.addNumber(this.formData.addNumber);
          this.$refs.form.resetFields();
        });
      },
      filterDigits() {
        const src = String(this.formData.addNumber || '');
        if (!src) {
          this.formData.addNumber = '';
          return;
        }
        const digits = src.replace(/\D/g, '');
        const seen = new Set();
        let res = '';
        for (let i = 0; i < digits.length && res.length < 10; i++) {
          const d = digits[i];
          if (!seen.has(d)) {
            seen.add(d);
            res += d;
          }
        }
        this.formData.addNumber = res;
      },
      handleInputEnter() {
        const validation = this.validateNumber(this.formData.addNumber);
        if (validation.valid) {
          this.tryAddCurrentInput();
        }
      },
      handleInputBlur() {
        window.scrollTo(0, 0);
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 300);
        if (!this.formData.addNumber) return;
        this.handleInputEnter();
      },
      addNumber(number) {
        if (!number || typeof number !== 'string') {
          return;
        }
        const list = [...String(number)].map((n) => +n);
        this.showNumberList.unshift(list);
        this.handleAddNumber();
      },
      deleteItem(index) {
        if (index < 0 || index >= this.showNumberList.length) {
          return;
        }
        this.$confirm(`Delete item ${index + 1} ?`, {})
          .then(() => {
            this.showNumberList.splice(index, 1);
            this.handleAddNumber();
          })
          .catch(() => {});
      },
      clearAll() {
        this.$confirm('Clear all ?', { type: 'warning' })
          .then(() => {
            this.formData.addNumber = '';
            this.showNumberList = [];
            this.clearCache();
            this.madeResults = {};
          })
          .catch(() => {});
      },
      clearCache() {
        this.compareCache = {};
        this.highlightCriterionCache = {};
      },
      recomputeAllMade() {
        this.clearCache();
        this.madeResults = {};
        const arrList = this.getTableArrList(this.showNumberList);
        for (let i = 0; i < MadeKeys.length; i++) {
          const key = MadeKeys[i];
          this.madeResults[key] = this.computeBestResult(key, arrList);
        }
      },
      compareSign(digitIndex, selectedDigitIndex, isEnhanced = false) {
        const key = (isEnhanced ? 1 : 0) * 10000 + digitIndex * 100 + selectedDigitIndex;
        const compareCache = this.compareCache;
        if (compareCache[key] == null) {
          const result = this.handleResult(digitIndex, selectedDigitIndex);
          const diffLength = result.length;
          const mode = isEnhanced ? this.compareModes.enhanced : this.compareModes.normal;
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
      },
      breaksPattern(colorSeq) {
        const len = this.patternLength;
        if (!Number.isInteger(len) || len <= 0) return true;
        for (let i = len; i < colorSeq.length; i++) {
          if (colorSeq[i] !== colorSeq[i % len]) return true;
        }
        return false;
      },
      isPeriodicColors(colorSeq) {
        if (!this.validatePatternLength()) return false;
        if (colorSeq.length < this.patternLength) return false;
        return !this.breaksPattern(colorSeq);
      },
      computeRowForMade(madeKey, startRow, arrList, skipCols) {
        try {
          const info = MadeKeyInfo[madeKey];
          if (!info) return [];
          if (!Array.isArray(arrList) || arrList.length === 0 || !arrList[0]) return [];
          const totalRows = arrList[0].length;
          const rows = totalRows - startRow;
          if (rows < 2) return Array(10).fill('-');
          const tabValue = info.value;
          const isEnhanced = info.isEnhanced;
          const maxPath = info.maxPath;
          const colLabel = (idx) => ((idx + 1) % 10);
          const row = [];
          for (let startCol = 0; startCol < 10; startCol++) {
            if (skipCols && skipCols[startCol]) {
              row[startCol] = '-';
              continue;
            }
            const firstVal = arrList[startCol] && arrList[startCol][startRow];
            if (firstVal == null) {
              row[startCol] = '-';
              continue;
            }
            const firstColor = this.compareSign(firstVal, tabValue, isEnhanced);
            if (firstColor === '0') {
              row[startCol] = '-';
              continue;
            }
            const path = [startCol];
            const usedCols = [startCol];
            const patternColors = firstColor === '?' ? [] : [firstColor];
            for (let r = 1; r < rows && path.length < maxPath; r++) {
              let picked = -1;
              for (let step = 1; step <= 10; step++) {
                const c = (path[path.length - 1] + step) % 10;
                if (usedCols.indexOf(c) !== -1) continue;
                const v = arrList[c] && arrList[c][startRow + r];
                if (v == null) continue;
                const color = this.compareSign(v, tabValue, isEnhanced);
                if (color === '0') continue;
                if (color !== '?' && this.breaksPattern(patternColors.concat([color]))) continue;
                picked = c;
                if (color !== '?') patternColors.push(color);
                break;
              }
              if (picked < 0) break;
              path.push(picked);
              usedCols.push(picked);
            }
            const cols = [];
            const colorSeq = [];
            for (let r = 0; r < rows; r++) {
              const c = path[r % path.length];
              cols.push(c);
              const v = arrList[c] && arrList[c][startRow + r];
              colorSeq.push(v == null ? '0' : this.compareSign(v, tabValue, isEnhanced));
            }
            const filteredSeq = colorSeq.filter((s) => s !== '0');
            const redBlueSeq = filteredSeq.filter((s) => s !== '?');
            if (!this.isPeriodicColors(redBlueSeq)) {
              row[startCol] = '-';
              continue;
            }
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
            const cc = this.countPmAndQ(fullSymbols);
            const badgePm = cc.pmCount + 1;
            const badgeCountVal = badgePm + cc.qCount;
            const leftLabel = String(badgeCountVal);
            const rightCount = badgePm;
            let nextCol = path[rows % path.length];
            if (path.length === rows && path.length < maxPath) {
              for (let step = 1; step <= 10; step++) {
                const candidate = (path[path.length - 1] + step) % 10;
                if (usedCols.indexOf(candidate) === -1) {
                  nextCol = candidate;
                  break;
                }
              }
            }
            const trackCols = cols.concat([nextCol]);
            const nextColDigit = colLabel(nextCol);
            const merged = String(nextColDigit) + String(tabValue);
            const maybeBracketed = isEnhanced ? `[${merged}]` : merged;
            const s0 = symbols[0];
            const s1 = symbols[1];
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
              formattedColumnTrack: this.formatColumnTrack(trackCols, colorSeq, colLabel),
              isEffective: true,
              leftVal: badgeCountVal,
              rightVal: rightCount,
            };
          }
          return row;
        } catch {
          return [];
        }
      },
      getItemsForMade(madeKey) {
        const results = this.madeResults[madeKey] || [];
        const items = [];
        for (let i = 0; i < results.length; i++) {
          const item = results[i];
          if (item && item !== '-' && typeof item === 'object' && item.fullSymbols) {
            items.push(item);
          }
        }
        return items;
      },
      validatePatternLength() {
        const patternLength = this.patternLength;
        return typeof patternLength === 'number' && Number.isInteger(patternLength) && patternLength > 0;
      },
      countPmAndQ(resultStr) {
        if (typeof resultStr !== 'string') return { pmCount: 0, qCount: 0 };
        let pm = 0, q = 0;
        for (let i = 0; i < resultStr.length; i++) {
          const c = resultStr[i];
          if (c === '+' || c === '-') pm++;
          else if (c === '?') q++;
        }
        return { pmCount: pm, qCount: q };
      },
      computeBestResult(madeKey, arrList) {
        try {
          const totalRows = arrList.length ? arrList[0].length : 0;
          if (totalRows < 2) {
            return Array(10).fill('-');
          }
          const bestResults = Array(10).fill(null);
          const bestCounts = Array(10).fill(0);
          const saturated = Array(10).fill(false);
          for (let startRow = 0; startRow <= totalRows - 2; startRow++) {
            if (saturated.every((v) => v)) break;
            const rows = totalRows - startRow;
            const currentResult = this.computeRowForMade(madeKey, startRow, arrList, saturated);
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
                }
              }
            }
          }
          return bestResults.map((result) => result || '-');
        } catch {
          return Array(10).fill('-');
        }
      },
      handleAddNumber() {
        try {
          if (!Array.isArray(this.showNumberList)) {
            this.showNumberList = [];
          }
          if (this.showNumberList.length > this.lengthLimit) {
            this.showNumberList = this.showNumberList.slice(0, this.lengthLimit);
          }
          this.recomputeAllMade();
        } catch {
          this.clearCache();
          this.madeResults = {};
        }
      },
      getTableArrList(showNumberList) {
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
      },
      handleResult(index1, index2) {
        try {
          const compareNumberList = this.compareNumberList;
          const constList = this.constList;
          if (
            index1 == null ||
            index2 == null ||
            typeof index1 !== 'number' ||
            typeof index2 !== 'number' ||
            index1 < 0 ||
            index1 >= compareNumberList.length ||
            index2 < 0 ||
            index2 >= compareNumberList.length
          ) {
            return [];
          }
          const val1 = compareNumberList[index1];
          const val2 = compareNumberList[index2];
          if (val1 == null || val2 == null) {
            return [];
          }
          const arr = [...constList];
          const arr1 = String(val1).split('');
          const arr2 = String(val2).split('');
          const strNumberSet = new Set((arr1.join('') + arr2.join('')).split(''));
          return arr.filter((item) => !strNumberSet.has(item));
        } catch {
          return [];
        }
      },
    },
  };
</script>

<style scoped>
  .my-component-container {
    width: 100%;
    margin: 0 auto;
    padding: calc(env(safe-area-inset-top, 0px) + 12px) calc(env(safe-area-inset-left, 0px) + 12px) calc(env(safe-area-inset-bottom, 0px) + 20px) calc(env(safe-area-inset-right, 0px) + 12px);
    background: #f7f8fa;
    overflow-x: hidden;
    overflow-y: auto;
    min-height: 100vh;
    box-sizing: border-box;
    --ctrl-h: 36px;
    --btn-w: 52px;
    --cell-min-h: calc(var(--fs-num) * 11);
    --tab-cell-w: 56px;
    --tab-cell-h: 42px;
    --fs-num: clamp(14px, 2.2vw, 16px);
    --cross-w: 44px;
    --cross-h: 40px;
  }
  @supports (min-height: 100dvh) {
    .my-component-container {
      min-height: 100dvh;
    }
  }
  @media (max-width: 375px) {
    .my-component-container {
      padding: calc(env(safe-area-inset-top, 0px) + 6px) calc(env(safe-area-inset-left, 0px) + 4px) calc(env(safe-area-inset-bottom, 0px) + 10px) calc(env(safe-area-inset-right, 0px) + 4px);
      --ctrl-h: 32px;
      --tab-cell-w: 52px;
      --tab-cell-h: 40px;
      --cross-w: 40px;
      --cross-h: 36px;
    }
  }
  @media (min-width: 376px) and (max-width: 600px) {
    .my-component-container {
      padding: calc(env(safe-area-inset-top, 0px) + 8px) calc(env(safe-area-inset-left, 0px) + 6px) calc(env(safe-area-inset-bottom, 0px) + 14px) calc(env(safe-area-inset-right, 0px) + 6px);
      --ctrl-h: 34px;
      --tab-cell-w: 56px;
      --tab-cell-h: 44px;
      --cross-w: 44px;
      --cross-h: 40px;
    }
  }
  @media (min-width: 601px) and (max-width: 768px) {
    .my-component-container {
      padding: 16px 20px 24px;
    }
  }
  @media (min-width: 769px) {
    .my-component-container {
      max-width: 640px;
      padding: 24px 32px 40px;
    }
  }
  @media (max-width: 600px) {
    /* noinspection CssUnusedSymbol */
    .result-card :deep(.el-card__body),
    .tabs-card :deep(.el-card__body),
    .input-card :deep(.el-card__body),
    .number-list-card :deep(.el-card__body) {
      padding: 6px 8px;
    }
    .input-row {
      gap: 4px;
    }
    .show-number-list .row {
      gap: 4px;
    }
  }
  @media (max-height: 500px) and (orientation: landscape) {
    .my-component-container {
      padding: calc(env(safe-area-inset-top, 0px) + 4px) calc(env(safe-area-inset-left, 0px) + 6px) calc(env(safe-area-inset-bottom, 0px) + 6px) calc(env(safe-area-inset-right, 0px) + 6px);
      --ctrl-h: 30px;
    }
  }
  .result-card,
  .tabs-card,
  .input-card,
  .number-list-card {
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  /* noinspection CssUnusedSymbol */
  .result-card :deep(.el-card),
  .tabs-card :deep(.el-card) {
    border: 1px solid #dcdfe6;
    border-radius: 6px;
  }
  /* noinspection CssUnusedSymbol */
  .result-card :deep(.el-card__body),
  .tabs-card :deep(.el-card__body),
  .input-card :deep(.el-card__body),
  .number-list-card :deep(.el-card__body) {
    padding: 8px 12px;
    box-sizing: border-box;
  }
  /* noinspection CssUnusedSymbol */
  .result-card :deep(.el-card__body) *,
  .tabs-card :deep(.el-card__body) *,
  .input-card :deep(.el-card__body) *,
  .number-list-card :deep(.el-card__body) * {
    box-sizing: border-box;
  }
  .result-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    grid-template-rows: auto;
    gap: 1px;
  }
  .result-cell,
  .tab-cell {
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    background: #fff;
  }
  .result-cell {
    container-type: inline-size;
    min-height: var(--cell-min-h);
    padding: 2px 1px;
  }
  .result-cell:active {
    background-color: #f5f7fa;
  }
  .result-cell-highlight,
  .tab-cell-active {
    background-color: #c9ccd0 !important;
  }
  .result-cell-highlight:active,
  .tab-cell-active:active {
    background-color: #b0b3b8 !important;
  }
  .tab-window {
    position: relative;
    display: flex;
    gap: 1px;
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    scrollbar-width: none;
  }
  .tab-window::-webkit-scrollbar {
    display: none;
  }
  .tab-cell {
    flex: 0 0 auto;
    min-width: var(--tab-cell-w);
    min-height: var(--tab-cell-h);
    padding: 0;
    cursor: pointer;
    transition: background-color 0.1s ease;
    -webkit-user-select: none;
    user-select: none;
    touch-action: manipulation;
  }
  @media (hover: hover) {
    .tab-cell:hover {
      background: #f5f7fa;
    }
  }
  .tab-cell:active {
    background-color: #ebeef5;
    transition: background-color 0s;
  }
  .tab-cell-placeholder {
    cursor: default;
  }
  @media (hover: hover) {
    .tab-cell-placeholder:hover {
      background: #fff;
    }
  }
  .tab-cell-placeholder:active {
    background-color: #fff;
  }
  .tab-cell-placeholder .tab-cross-item {
    font-weight: 400;
  }
  .tab-cross {
    position: relative;
    width: 100%;
    max-width: var(--cross-w);
    height: var(--cross-h);
  }
  .tab-cross-item {
    position: absolute;
    width: 1em;
    height: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-num);
    font-weight: 900;
    color: #303133;
    line-height: 1;
  }
  .tab-cross-top {
    top: 0;
    left: calc(50% - 0.5em);
  }
  .tab-cross-right {
    top: calc(50% - 0.5em);
    right: 0;
  }
  .tab-cross-bottom {
    bottom: 0;
    left: calc(50% - 0.5em);
  }
  .tab-cross-left {
    top: calc(50% - 0.5em);
    left: 0;
  }
  /* noinspection CssUnusedSymbol */
  .input-card :deep(.el-form) {
    width: 100%;
    padding: 0;
    margin: 0;
  }
  /* noinspection CssUnusedSymbol */
  .input-card :deep(.el-form-item) {
    margin: 0;
    padding: 0;
    width: 100%;
  }
  .input-row {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
  }
  /* noinspection CssUnusedSymbol */
  .input-row :deep(.el-form-item__content) {
    width: 100%;
    margin-left: 0 !important;
  }
  /* noinspection CssUnusedSymbol */
  .input-row :deep(.el-input) {
    flex: 1;
    min-width: 0;
  }
  /* noinspection CssUnusedSymbol */
  .input-row :deep(.el-input__wrapper) {
    width: 100%;
    height: var(--ctrl-h);
    box-sizing: border-box;
  }
  .input-row .btn-group {
    display: flex;
    width: var(--btn-w);
    flex-shrink: 0;
  }
  /* noinspection CssUnusedSymbol */
  .input-row .btn-group :deep(.el-button) {
    width: 100%;
  }
  /* noinspection CssUnusedSymbol */
  .my-component-container :deep(.el-button--small) {
    height: max(var(--ctrl-h), 32px);
    min-width: 44px;
    padding: 5px 11px;
    margin: 0 !important;
    touch-action: manipulation;
  }
  @media (max-width: 600px) {
    /* noinspection CssUnusedSymbol */
    .my-component-container :deep(.el-button--small) {
      min-width: 0;
      height: var(--ctrl-h);
    }
  }
  .action-btn {
    width: var(--btn-w);
    box-sizing: border-box;
    flex-shrink: 0;
  }
  .valueCol,
  .main-result,
  .sub-result {
    font-size: var(--fs-num);
    font-weight: 900;
    line-height: 1;
    padding: 0;
    display: block;
    text-align: center;
  }
  .valueCol,
  .main-result {
    width: 100%;
    white-space: nowrap;
  }
  .valueCol {
    word-break: keep-all;
    box-sizing: border-box;
  }
  .main-result {
    margin-bottom: 0;
  }
  .sub-result {
    color: #666;
    margin-top: 0;
    margin-bottom: 0;
    overflow: visible;
    text-overflow: ellipsis;
    box-sizing: border-box;
  }
  @media (max-width: 600px) {
    .sub-result {
      white-space: normal;
      word-break: break-all;
    }
  }
  /* noinspection CssUnusedSymbol */
  .track-red {
    color: red;
  }
  /* noinspection CssUnusedSymbol */
  .track-gray {
    color: gray;
  }
  /* noinspection CssUnusedSymbol */
  .track-blue {
    color: blue;
  }
  .show-number-list {
    padding: 0;
  }
  .show-number-list ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .show-number-list .row {
    display: flex;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid #eee;
    gap: 6px;
    width: 100%;
  }
  .show-number-list .row .column-item {
    flex: 1;
    height: max(var(--ctrl-h), 32px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #dcdfe6;
    text-align: center;
    line-height: var(--ctrl-h);
    font-size: var(--fs-num);
    font-weight: 900;
    background: #fff;
    border-radius: 4px;
    min-width: 0;
    -webkit-user-select: text;
    user-select: text;
  }
  .show-number-list .row .column-item-placeholder {
    font-size: inherit;
    font-weight: 400;
  }
  /* noinspection CssUnusedSymbol */
  .my-component-container :deep(.el-input__inner) {
    height: var(--ctrl-h);
    font-size: var(--fs-num);
  }
  .show-number-list .row .action-btn {
    margin-left: auto;
    flex-shrink: 0;
  }
  .result-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 0;
    box-sizing: border-box;
    text-align: center;
    margin: 0;
    line-height: 1;
  }
</style>
