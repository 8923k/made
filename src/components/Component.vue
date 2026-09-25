<template>
  <div class="my-component-container">
    <el-card shadow="never" class="result-card">
      <div class="result-grid">
        <div
          v-for="(item, idx) in resultTwentyItems"
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
                  v-for="(segments, lineIndex) in item.formattedColumnTrack ||
                  []"
                  :key="lineIndex"
                ><span v-for="(segment, segmentIndex) in segments" :key="segmentIndex" :class="segment.colorClass">{{ segment.text }}</span><br
                    v-if="
                      lineIndex < (item.formattedColumnTrack || []).length - 1
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
  const MadeKeyRegex = /^(\d+)_(\d+)$|^(\d+)_\[(\d+)]$|^\[(\d+)]_(\d+)$|^\[(\d+)_(\d+)]$/;
  export default {
    data() {
      const arr = [1, 2, 3, 4, 5];
      const combinationArrList = [];
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length; j++) {
          combinationArrList.push([arr[i], arr[j]]);
        }
      }
      return {
        formData: { addNumber: '' },
        madeResultsForward: {},
        madeResultsReverse: {},
        compareCache: {},
        madeHighlightCache: {},
        staticMadeLabelMap: null,
        selectedMadeKey: '',
        combinationArrList,
        patternValidCache: null,
        compareNumberList: [12890, 12390, 12340, 12345, 23456, 34567, 45678, 56789, 67890, 17890],
        constList: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        lengthLimit: 33,
        showSubResults: true,
        tabConfig: {
          compare: 'r_+_+', // 'l'/'r' _ '+'/'-' _ '+'/'-'
          sortOrder: 'default', // 'default', 'desc', 'asc'
          selection: 'user', // 'user', 'max', 'min'
        },
        // patternLength: 2,
        patternLength: {
          '55': { left: { value: '=2' }, right: { value: '>=2' } },
          '00': { left: { value: '=2' }, right: { value: '>=2' } },
          '50': { left: { value: '=2' }, right: { value: '>=2' } },
          '05': { left: { value: '=2' }, right: { value: '>=2' } }
        },
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
      visibleMadeKeys() {
        const validMade = [];
        const combos = this.combinationArrList;
        for (let ci = 0; ci < combos.length; ci++) {
          const num1 = combos[ci][0];
          const num2 = combos[ci][1];
          const keys = [
            `${num1}_${num2}`,
            `${num1}_[${num2}]`,
            `[${num1}]_${num2}`,
            `[${num1}_${num2}]`,
          ];
          for (let ki = 0; ki < 4; ki++) {
            const key = keys[ki];
            let leftVal = 0;
            let rightVal = 0;
            if (this.hasValidResult(key)) {
              const highlightItem = this.getTabHighlightItem(key);
              if (highlightItem) {
                leftVal = highlightItem.leftVal;
                rightVal = highlightItem.rightVal;
              }
            }
            validMade.push({
              key: key,
              leftVal: leftVal,
              rightVal: rightVal,
              origIdx: validMade.length,
            });
          }
        }
        if (this.tabConfig.sortOrder !== 'default') {
          const order = this.tabConfig.sortOrder === 'asc' ? 1 : -1;
          const byLeft = this.compareParts.isLeft;
          validMade.sort((a, b) => {
            const ap = byLeft ? a.leftVal : a.rightVal;
            const bp = byLeft ? b.leftVal : b.rightVal;
            if (ap !== bp) return (ap - bp) * order;
            const as = byLeft ? a.rightVal : a.leftVal;
            const bs = byLeft ? b.rightVal : b.leftVal;
            if (as !== bs) return (as - bs) * order;
            return a.origIdx - b.origIdx;
          });
        }
        return validMade.map((made) => made.key);
      },
      displayTabItems() {
        const keys = this.visibleMadeKeys;
        let anyValid = false;
        for (let i = 0; i < keys.length; i++) {
          if (this.hasValidResult(keys[i])) {
            anyValid = true;
            break;
          }
        }
        if (!anyValid) {
          const out = new Array(keys.length);
          for (let i = 0; i < keys.length; i++) {
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
        const labelMap = this.buildMadeLabelMap();
        const out = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
          const madeKey = keys[i];
          const staticLabel = labelMap[madeKey] || { leftCol: '--', rightCol: '--' };
          const highlightItem = this.getTabHighlightItem(madeKey);
          const seg = highlightItem && highlightItem.displaySegments;
          const hl = seg ? seg.leftLabel : '';
          const hr = seg ? seg.rightCount : null;
          out[i] = {
            key: madeKey,
            isPlaceholder: false,
            highlightLeft: hl || '',
            rightCol: staticLabel.rightCol || '--',
            highlightRight: hr != null ? hr : '',
            leftCol: staticLabel.leftCol || '--',
          };
        }
        return out;
      },
      resultTwentyItems() {
        const key = this.selectedMadeKey;
        const forward = (this.madeResultsForward[key] && this.madeResultsForward[key][0]) || [];
        const reverse = (this.madeResultsReverse[key] && this.madeResultsReverse[key][0]) || [];
        const items = [...forward, ...reverse];
        while (items.length < 20) {
          items.push('-');
        }
        return items.slice(0, 20);
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
        if (!newVal || newVal.length === 0) return;
        let anyValid = false;
        for (let i = 0; i < newVal.length; i++) {
          if (this.hasValidResult(newVal[i])) {
            anyValid = true;
            break;
          }
        }
        if (!anyValid) return;
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
          let bestKey = targetKey;
          let bestPrimary = isMax ? -Infinity : Infinity;
          let bestSecondary = isMax ? -Infinity : Infinity;
          for (let i = 0; i < newVal.length; i++) {
            const key = newVal[i];
            const hl = this.getTabHighlightItem(key);
            if (!hl) continue;
            const leftVal = hl.leftVal;
            const rightVal = hl.rightVal;
            const primary = byLeft ? leftVal : rightVal;
            const secondary = byLeft ? rightVal : leftVal;
            const better = isMax
              ? primary > bestPrimary || (primary === bestPrimary && secondary > bestSecondary)
              : primary < bestPrimary || (primary === bestPrimary && secondary < bestSecondary);
            if (better) {
              bestPrimary = primary;
              bestSecondary = secondary;
              bestKey = key;
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
      this.buildMadeLabelMap();
      this.handleAddNumber();
    },
    methods: {
      centerActiveTab() {
        const el = this.$refs.tabWindow;
        if (!el) return;
        const cell = el.querySelector(`.tab-cell-active`);
        if (!cell) return;
        const w = el.clientWidth;
        const target = cell.offsetLeft - w / 2 + cell.offsetWidth / 2;
        el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      },
      validateAlternatingRight(seq) {
        let cleaned = seq;
        if (seq.indexOf('1') !== -1) {
          cleaned = seq.replace(/1/g, '');
        }
        if (cleaned.length === 0) return false;
        for (let i = 0; i < cleaned.length - 1; i++) {
          if (cleaned[i] === cleaned[i + 1]) return false;
        }
        return true;
      },
      buildPatternCtx(numberSeq, leftConfig, rightConfig) {
        const leftCondition = this.parseRelation(leftConfig.value);
        const rightCondition = this.parseRelation(rightConfig.value);
        const maxSplit = numberSeq.length;
        const prefixCount = new Array(maxSplit + 1);
        prefixCount[0] = 0;
        for (let i = 0; i < maxSplit; i++) {
          prefixCount[i + 1] = prefixCount[i] + (numberSeq.charCodeAt(i) === 49 ? 0 : 1);
        }
        const cleanedSeq = numberSeq.indexOf('1') === -1 ? numberSeq : numberSeq.replace(/1/g, '');
        const splitPoints = this.getValidSplitPoints(numberSeq, leftCondition, rightCondition, prefixCount);
        return { prefixCount, cleanedSeq, splitPoints };
      },
      validate55Pattern(numberSeq, leftConfig, rightConfig, sharedCtx) {
        const ctx = sharedCtx || this.buildPatternCtx(numberSeq, leftConfig, rightConfig);
        const { cleanedSeq, prefixCount, splitPoints } = ctx;
        for (const split of splitPoints) {
          const leftLen = prefixCount[split];
          if (leftLen === 0 || leftLen === cleanedSeq.length) continue;
          const leftCleaned = cleanedSeq.substring(0, leftLen);
          const rightCleaned = cleanedSeq.substring(leftLen);
          let leftOk = true;
          for (let i = 0; i < leftCleaned.length; i++) {
            if (leftCleaned[i] !== '5') { leftOk = false; break; }
          }
          if (!leftOk) continue;
          let rightOk = true;
          for (let i = 0; i < rightCleaned.length; i++) {
            if (rightCleaned[i] !== '0') { rightOk = false; break; }
          }
          if (!rightOk) continue;
          return true;
        }
        return false;
      },
      validate00Pattern(numberSeq, leftConfig, rightConfig, sharedCtx) {
        const ctx = sharedCtx || this.buildPatternCtx(numberSeq, leftConfig, rightConfig);
        const { cleanedSeq, prefixCount, splitPoints } = ctx;
        for (const split of splitPoints) {
          const leftLen = prefixCount[split];
          if (leftLen === 0 || leftLen === cleanedSeq.length) continue;
          const leftCleaned = cleanedSeq.substring(0, leftLen);
          const rightCleaned = cleanedSeq.substring(leftLen);
          let leftOk = true;
          for (let i = 0; i < leftCleaned.length; i++) {
            if (leftCleaned[i] !== '0') { leftOk = false; break; }
          }
          if (!leftOk) continue;
          let rightOk = true;
          for (let i = 0; i < rightCleaned.length; i++) {
            if (rightCleaned[i] !== '5') { rightOk = false; break; }
          }
          if (!rightOk) continue;
          return true;
        }
        return false;
      },
      validate50Pattern(numberSeq, leftConfig, rightConfig, sharedCtx) {
        const ctx = sharedCtx || this.buildPatternCtx(numberSeq, leftConfig, rightConfig);
        const { cleanedSeq, prefixCount, splitPoints } = ctx;
        for (const split of splitPoints) {
          const leftLen = prefixCount[split];
          if (leftLen === 0 || leftLen === cleanedSeq.length) continue;
          const leftCleaned = cleanedSeq.substring(0, leftLen);
          const rightCleaned = cleanedSeq.substring(leftLen);
          if (!leftCleaned.startsWith('50')) continue;
          let leftValid = true;
          for (let i = 0; i < leftCleaned.length - 1; i++) {
            if (leftCleaned[i] === leftCleaned[i + 1]) {
              leftValid = false;
              break;
            }
          }
          if (!leftValid) continue;
          const leftLastChar = leftCleaned[leftCleaned.length - 1];
          if (rightCleaned[0] !== leftLastChar) continue;
          if (!this.validateAlternatingRight(rightCleaned)) continue;
          return true;
        }
        return false;
      },
      validate05Pattern(numberSeq, leftConfig, rightConfig, sharedCtx) {
        const ctx = sharedCtx || this.buildPatternCtx(numberSeq, leftConfig, rightConfig);
        const { cleanedSeq, prefixCount, splitPoints } = ctx;
        for (const split of splitPoints) {
          const leftLen = prefixCount[split];
          if (leftLen === 0 || leftLen === cleanedSeq.length) continue;
          const leftCleaned = cleanedSeq.substring(0, leftLen);
          const rightCleaned = cleanedSeq.substring(leftLen);
          if (!leftCleaned.startsWith('05')) continue;
          let leftValid = true;
          for (let i = 0; i < leftCleaned.length - 1; i++) {
            if (leftCleaned[i] === leftCleaned[i + 1]) {
              leftValid = false;
              break;
            }
          }
          if (!leftValid) continue;
          const leftLastChar = leftCleaned[leftCleaned.length - 1];
          if (rightCleaned[0] !== leftLastChar) continue;
          if (!this.validateAlternatingRight(rightCleaned)) continue;
          return true;
        }
        return false;
      },
      parseRelation(relationStr) {
        if (typeof relationStr === 'number') {
          return { operator: '=', value: relationStr };
        }
        if (!this.parseRelationCache) this.parseRelationCache = {};
        const cached = this.parseRelationCache[relationStr];
        if (cached) return cached;
        const match = relationStr.match(/^([><]?=?)(\d+)$/);
        let result;
        if (match) {
          result = { operator: match[1], value: parseInt(match[2]) };
        } else {
          result = { operator: '=', value: parseInt(relationStr) };
        }
        this.parseRelationCache[relationStr] = result;
        return result;
      },
      checkLengthCondition(length, condition) {
        const { operator, value } = condition;
        switch (operator) {
          case '>':
            return length > value;
          case '>=':
            return length >= value;
          case '<':
            return length < value;
          case '<=':
            return length <= value;
          case '=':
          default:
            return length === value;
        }
      },
      getValidSplitPoints(seq, leftCondition, rightCondition, prefixCount) {
        const points = [];
        const maxSplit = seq.length;
        const totalNonOne = prefixCount[maxSplit];
        for (let split = 0; split <= maxSplit; split++) {
          const leftLen = prefixCount[split];
          const rightLen = totalNonOne - leftLen;
          if (this.checkLengthCondition(leftLen, leftCondition) &&
              this.checkLengthCondition(rightLen, rightCondition)) {
            points.push(split);
          }
        }
        return points;
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
          const forwardItems = this.getItemsForHighlight('forward');
          const reverseItems = this.getItemsForHighlight('reverse');
          const allItems = forwardItems.concat(reverseItems);
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
      getItemsForHighlight(direction) {
        return this.getItemsForMade(this.selectedMadeKey, direction);
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
          if (valid) {
            const validation = this.validateNumber(this.formData.addNumber);
            if (!validation.valid) {
              return false;
            }
            this.addNumber(this.formData.addNumber);
            this.resetForm('form');
          } else {
            return false;
          }
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
        const val = String(this.formData.addNumber || '');
        if (!val) return;
        const validation = this.validateNumber(val);
        if (!validation.valid) {
          return;
        }
        this.tryAddCurrentInput();
      },
      resetForm(formName) {
        // noinspection JSUnresolvedFunction
        this.$refs[formName].resetFields();
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
            this.madeResultsForward = {};
            this.madeResultsReverse = {};
          })
          .catch(() => {});
      },
      buildMadeLabelMap() {
        if (this.staticMadeLabelMap) return this.staticMadeLabelMap;
        const map = {};
        const combos = this.combinationArrList || [];
        for (let ci = 0; ci < combos.length; ci++) {
          const n1 = combos[ci][0];
          const n2 = combos[ci][1];
          const s1 = String(n1);
          const s2 = String(n2);
          map[`${n1}_${n2}`] = { leftCol: s1, rightCol: s2 };
          map[`${n1}_[${n2}]`] = { leftCol: s1, rightCol: `${s2}]` };
          map[`[${n1}]_${n2}`] = { leftCol: `[${s1}`, rightCol: s2 };
          map[`[${n1}_${n2}]`] = { leftCol: `[${s1}`, rightCol: `${s2}]` };
        }
        this.staticMadeLabelMap = map;
        return map;
      },
      clearCache() {
        this.compareCache = {};
        this.madeHighlightCache = {};
        this.highlightCriterionCache = {};
      },
      recomputeAllMade() {
        this.clearCache();
        this.madeResultsForward = {};
        this.madeResultsReverse = {};
        if (
          !this.combinationArrList ||
          !Array.isArray(this.combinationArrList) ||
          this.combinationArrList.length === 0
        ) {
          return;
        }
        for (const combinationArr of this.combinationArrList) {
          const num1 = combinationArr[0];
          const num2 = combinationArr[1];
          const type1Key = `${num1}_${num2}`;
          const type2Key = `${num1}_[${num2}]`;
          const type3Key = `[${num1}]_${num2}`;
          const type4Key = `[${num1}_${num2}]`;
          [type1Key, type2Key, type3Key, type4Key].forEach((key) => {
            try {
              const bestForward = this.computeBestResult(key, 'forward');
              const bestReverse = this.computeBestResult(key, 'reverse');
              this.madeResultsForward[key] = [bestForward];
              this.madeResultsReverse[key] = [bestReverse];
            } catch {
              // Ignore errors
            }
          });
        }
      },
      compareSign(digitIndex, selectedDigitIndex, isGateSign = false, isEnhanced = false) {
        try {
          if (digitIndex == null || selectedDigitIndex == null) {
            return '0';
          }
          digitIndex = Number(digitIndex);
          selectedDigitIndex = Number(selectedDigitIndex);
          if (isNaN(digitIndex) || isNaN(selectedDigitIndex)) {
            return '0';
          }
          const key = (isEnhanced ? 1 : 0) * 10000 + (isGateSign ? 1 : 0) * 1000 + digitIndex * 100 + selectedDigitIndex;
          const compareCache = this.compareCache;
          if (compareCache[key] == null) {
            const result = this.handleResult(digitIndex, selectedDigitIndex);
            const diffLength = result.length;
            const compareModes = this.compareModes;
            if (!isEnhanced) {
              const inPositive = compareModes.normal.positive.includes(diffLength);
              const inNegative = compareModes.normal.negative.includes(diffLength);
              if (!inPositive && !inNegative) {
                compareCache[key] = '?';
              } else if (inPositive && inNegative) {
                compareCache[key] = '?';
              } else if (inPositive) {
                compareCache[key] = '-';
              } else if (inNegative) {
                compareCache[key] = '+';
              }
            } else {
              const inPositive = compareModes.enhanced.positive.includes(diffLength);
              const inNegative = compareModes.enhanced.negative.includes(diffLength);
              if (!inPositive && !inNegative) {
                compareCache[key] = '?';
              } else if (inPositive && inNegative) {
                compareCache[key] = '?';
              } else if (inPositive) {
                compareCache[key] = '-';
              } else if (inNegative) {
                compareCache[key] = '+';
              }
            }
          }
          return compareCache[key] || '0';
        } catch {
          return '0';
        }
      },
      computeRowForMade(madeKey, order = 'forward', arrList) {
        try {
          if (!this.madeKeyParseCache) this.madeKeyParseCache = {};
          let parsed = this.madeKeyParseCache[madeKey];
          if (parsed === undefined) {
            const match = madeKey.match(MadeKeyRegex);
            if (!match) {
              this.madeKeyParseCache[madeKey] = null;
              return [];
            }
            const groups = match.slice(1);
            let p1, p2, isEnhanced1 = false, isEnhanced2 = false;
            if (groups[0] && groups[1]) {
              p1 = Number(groups[0]);
              p2 = Number(groups[1]);
            } else if (groups[2] && groups[3]) {
              p1 = Number(groups[2]);
              p2 = Number(groups[3]);
              isEnhanced2 = true;
            } else if (groups[4] && groups[5]) {
              p1 = Number(groups[4]);
              p2 = Number(groups[5]);
              isEnhanced1 = true;
            } else if (groups[6] && groups[7]) {
              p1 = Number(groups[6]);
              p2 = Number(groups[7]);
              isEnhanced1 = true;
              isEnhanced2 = true;
            } else {
              this.madeKeyParseCache[madeKey] = null;
              return [];
            }
            if (isNaN(p1) || isNaN(p2)) {
              this.madeKeyParseCache[madeKey] = null;
              return [];
            }
            parsed = { p1, p2, isEnhanced1, isEnhanced2 };
            this.madeKeyParseCache[madeKey] = parsed;
          }
          if (parsed === null) return [];
          const p1 = parsed.p1, p2 = parsed.p2, isEnhanced1 = parsed.isEnhanced1, isEnhanced2 = parsed.isEnhanced2;
          if (!arrList) arrList = this.getTableArrList(this.showNumberList);
          if (!Array.isArray(arrList) || arrList.length === 0 || !arrList[0]) return [];
          const totalCols = arrList.length;
          const totalRows = arrList[0].length;
          const row = [];
          const colLabel = (idx) => (idx + 1 === 10 ? 0 : idx + 1);
          const step = order === 'forward' ? 1 : -1;
          if (totalRows < 2) return Array(totalCols).fill('-');
          const compareSign = this.compareSign.bind(this);
          for (let startCol = 0; startCol < totalCols; startCol++) {
            const gateVal = arrList[startCol] && arrList[startCol][0];
            const sec0Val = arrList[startCol] && arrList[startCol][1];
            if (gateVal == null || sec0Val == null) {
              row[startCol] = '-';
              continue;
            }
            const gateSign = compareSign(gateVal, p1, true, isEnhanced1);
            if (gateSign === '?') {
              row[startCol] = '-';
              continue;
            }
            const stageCols = [startCol];
            const secondSeq = [compareSign(sec0Val, p2, false, isEnhanced2)];
            let ok = true;
            for (let s = 1; s <= totalRows - 2; s++) {
              const prevCol = stageCols[stageCols.length - 1];
              let picked = null;
              for (let i = 1; i <= totalCols; i++) {
                const c = (prevCol + i * step + totalCols) % totalCols;
                const vGate = arrList[c] && arrList[c][s];
                const vSec = arrList[c] && arrList[c][s + 1];
                if (vGate == null || vSec == null) continue;
                const currentGateSign = compareSign(vGate, p1, true, isEnhanced1);
                if (currentGateSign === '?') continue;
                if (currentGateSign !== gateSign) continue;
                picked = c;
                secondSeq.push(compareSign(vSec, p2, false, isEnhanced2));
                break;
              }
              if (picked === null) {
                ok = false;
                break;
              }
              stageCols.push(picked);
            }
            if (!ok) {
              row[startCol] = '-';
              continue;
            }
            const filteredSeq = secondSeq.filter((s) => s !== '0');
            const fullSymbols = filteredSeq.join('');
            if (filteredSeq.length === 0) {
              row[startCol] = '-';
              continue;
            }
            let numberSeq = '';
            for (let i = 0; i < fullSymbols.length; i++) {
              const symbol = fullSymbols[i];
              if (symbol === '+') numberSeq += '5';
              else if (symbol === '-') numberSeq += '0';
              else if (symbol === '?') numberSeq += '1';
            }
            const patternLengthConfig = this.patternLength;
            let isEffective = false;
            if (typeof patternLengthConfig === 'object' && patternLengthConfig !== null) {
              if (this.validatePatternLength() && numberSeq.length > 0) {
                let matchedObjectConfig = false;
                let sharedCtx = null;
                for (const key in patternLengthConfig) {
                  if (!Object.prototype.hasOwnProperty.call(patternLengthConfig, key)) continue;
                  const value = patternLengthConfig[key];
                  if (typeof value !== 'object' || value === null) continue;
                  if (!sharedCtx) sharedCtx = this.buildPatternCtx(numberSeq, value.left, value.right);
                  if (key === '55' && this.validate55Pattern(numberSeq, value.left, value.right, sharedCtx)) {
                    matchedObjectConfig = true;
                    break;
                  }
                  if (key === '00' && this.validate00Pattern(numberSeq, value.left, value.right, sharedCtx)) {
                    matchedObjectConfig = true;
                    break;
                  }
                  if (key === '50' && this.validate50Pattern(numberSeq, value.left, value.right, sharedCtx)) {
                    matchedObjectConfig = true;
                    break;
                  }
                  if (key === '05' && this.validate05Pattern(numberSeq, value.left, value.right, sharedCtx)) {
                    matchedObjectConfig = true;
                    break;
                  }
                }
                isEffective = matchedObjectConfig;
              }
            } else if (typeof patternLengthConfig === 'number') {
              isEffective = this.isEffectivePattern(fullSymbols);
            }
            if (!isEffective) {
              row[startCol] = '-';
              continue;
            }
            const prevCol = stageCols[stageCols.length - 1];
            const sNext = totalRows - 1;
            for (let i = 1; i <= totalCols; i++) {
              const c = (prevCol + i * step + totalCols) % totalCols;
              const vGate = arrList[c] && arrList[c][sNext];
              if (vGate == null) continue;
              const currentGateSign = compareSign(vGate, p1, true, isEnhanced1);
              if (currentGateSign === '?') continue;
              if (currentGateSign !== gateSign) continue;
              stageCols.push(c);
              break;
            }
            const rightCol = stageCols[stageCols.length - 1];
            const symbols = [];
            let count = 0;
            for (let i = secondSeq.length - 1; i >= 0 && count < 2; i--) {
              if (secondSeq[i] !== '0' && secondSeq[i] !== '?') {
                symbols.unshift(secondSeq[i]);
                count++;
              }
            }
            while (symbols.length < 2) {
              symbols.push('*');
            }
            const cc = this.countPmAndQ(fullSymbols);
            const badgePm = cc.pmCount + 1;
            const badgeQ = cc.qCount;
            const badgeCountVal = badgePm + badgeQ;
            const leftLabel = String(badgeCountVal);
            const rightColDigit = colLabel(rightCol);
            const tabRightDigit = String(p2);
            const merged = String(rightColDigit) + tabRightDigit;
            const maybeBracketed = isEnhanced2 ? `[${merged}]` : merged;
            const s0 = symbols[0];
            const s1 = symbols[1];
            const symColorClass = (s) =>
              s === '+' ? 'track-red' : s === '-' ? 'track-blue' : '';
            const rightCount = badgePm;
            const leftVal = badgeCountVal;
            const rightVal = rightCount;
            row[startCol] = {
              displaySegments: {
                leftLabel: leftLabel,
                sym0: s0,
                sym0Class: symColorClass(s0),
                middle: maybeBracketed,
                sym1: s1,
                sym1Class: symColorClass(s1),
                rightCount: rightCount,
              },
              fullSymbols: fullSymbols,
              formattedColumnTrack: this.formatColumnTrack(stageCols, secondSeq.slice(), colLabel),
              isEffective: true,
              leftVal,
              rightVal,
            };
          }
          return row;
        } catch {
          return [];
        }
      },
      getTabHighlightItem(madeKey) {
        const cacheKey = madeKey + '|' + this.tabConfig.compare;
        if (this.madeHighlightCache[cacheKey]) return this.madeHighlightCache[cacheKey];
        const forwardItems = this.getItemsForMade(madeKey, 'forward');
        const reverseItems = this.getItemsForMade(madeKey, 'reverse');
        const allItems = forwardItems.concat(reverseItems);
        if (allItems.length === 0) {
          this.madeHighlightCache[cacheKey] = null;
          return null;
        }
        const result = this.pickHighlightCriterion(allItems);
        const target = result.item ? result.item.item : null;
        this.madeHighlightCache[cacheKey] = target;
        return target;
      },
      getItemsForMade(madeKey, direction) {
        const results =
          direction === 'forward'
            ? (this.madeResultsForward[madeKey] && this.madeResultsForward[madeKey][0]) || []
            : (this.madeResultsReverse[madeKey] && this.madeResultsReverse[madeKey][0]) || [];
        const items = [];
        for (let i = 0; i < results.length; i++) {
          const item = results[i];
          if (item && item !== '-' && typeof item === 'object' && item.fullSymbols) {
            const leftVal = item.leftVal;
            const rightVal = item.rightVal;
            items.push({ item, leftVal, rightVal });
          }
        }
        return items;
      },
      hasValidResult(madeKey) {
        if (!madeKey || typeof madeKey !== 'string') {
          return false;
        }
        try {
          if (!this.madeResultsForward || typeof this.madeResultsForward !== 'object') {
            return false;
          }
          if (!this.madeResultsReverse || typeof this.madeResultsReverse !== 'object') {
            return false;
          }
          if (this.isResultValid(this.madeResultsForward[madeKey])) {
            return true;
          }
          if (this.isResultValid(this.madeResultsReverse[madeKey])) {
            return true;
          }
        } catch {
          // Ignore errors
        }
        return false;
      },
      isResultValid(result) {
        if (result && Array.isArray(result) && result.length > 0) {
          const row = result[0];
          if (row && Array.isArray(row) && row.some((v) => v !== '-')) {
            return true;
          }
        }
        return false;
      },
      validatePatternLength() {
        if (this.patternValidCache !== null) {
          return this.patternValidCache;
        }
        const patternLength = this.patternLength;
        let result = false;
        if (typeof patternLength === 'number') {
          result = Number.isInteger(patternLength) && patternLength > 0;
        } else if (typeof patternLength === 'object' && patternLength !== null) {
          let hasValidConfig = false;
          for (const key in patternLength) {
            if (Object.prototype.hasOwnProperty.call(patternLength, key)) {
              const value = patternLength[key];
              if (typeof value === 'object' && value !== null) {
                if (
                  Object.prototype.hasOwnProperty.call(value, 'left') &&
                  Object.prototype.hasOwnProperty.call(value, 'right')
                ) {
                  const leftConfig = value.left;
                  const rightConfig = value.right;
                  if (
                    typeof leftConfig === 'object' &&
                    leftConfig !== null &&
                    typeof rightConfig === 'object' &&
                    rightConfig !== null
                  ) {
                    const isValidLeft =
                      (typeof leftConfig.value === 'number' && leftConfig.value >= 1) ||
                      (typeof leftConfig.value === 'string' && /^(>|>=|<|<=|=)\d+$/.test(leftConfig.value));
                    const isValidRight =
                      (typeof rightConfig.value === 'number' && rightConfig.value >= 1) ||
                      (typeof rightConfig.value === 'string' && /^(>|>=|<|<=|=)\d+$/.test(rightConfig.value));
                    if (isValidLeft && isValidRight) {
                      hasValidConfig = true;
                    } else {
                      this.patternValidCache = false;
                      return false;
                    }
                  } else {
                    this.patternValidCache = false;
                    return false;
                  }
                } else {
                  this.patternValidCache = false;
                  return false;
                }
              } else {
                this.patternValidCache = false;
                return false;
              }
            }
          }
          result = hasValidConfig;
        }
        this.patternValidCache = result;
        return result;
      },
      countPmAndQ(resultStr) {
        if (typeof resultStr !== 'string') return { pmCount: 0, qCount: 0 };
        let pm = 0, q = 0;
        for (let i = 0; i < resultStr.length; i++) {
          const c = resultStr.charCodeAt(i);
          if (c === 43 || c === 45) pm++;
          else if (c === 63) q++;
        }
        return { pmCount: pm, qCount: q };
      },
      isEffectivePattern(symbolSeq) {
        if (!symbolSeq || typeof symbolSeq !== 'string') {
          return false;
        }
        if (!this.validatePatternLength()) {
          return false;
        }
        const patternLength = this.patternLength;
        let numberSeq = '';
        for (let i = 0; i < symbolSeq.length; i++) {
          const symbol = symbolSeq[i];
          if (symbol === '+') numberSeq += '5';
          else if (symbol === '-') numberSeq += '0';
        }
        if (numberSeq.length < patternLength) return false;
        const pattern = numberSeq.substring(0, patternLength);
        for (let i = 0; i < numberSeq.length; i++) {
          if (numberSeq[i] !== pattern[i % patternLength]) {
            return false;
          }
        }
        return true;
      },
      computeBestResult(madeKey, order = 'forward') {
        try {
          const showNumberList = this.showNumberList;
          const totalRows = showNumberList.length;
          if (totalRows < 2) {
            return Array(10).fill('-');
          }
          const bestResults = Array(10).fill(null);
          const bestCounts = Array(10).fill(0);
          const fullArrList = this.getTableArrList(showNumberList);
          for (let startRow = totalRows; startRow >= 2; startRow--) {
            let allSaturated = true;
            for (let col = 0; col < 10; col++) {
              if (bestCounts[col] < startRow - 1) { allSaturated = false; break; }
            }
            if (allSaturated) break;
            const offset = totalRows - startRow;
            const arrList = offset === 0
              ? fullArrList
              : fullArrList.map(arr => arr.slice(offset));
            const currentResult = this.computeRowForMade(madeKey, order, arrList);
            for (let col = 0; col < 10; col++) {
              const currentValue = currentResult[col];
              if (
                currentValue !== '-' &&
                typeof currentValue === 'object' &&
                currentValue.fullSymbols &&
                currentValue.isEffective
              ) {
                const currentCount = currentValue.fullSymbols.length;
                const currentBestCount = bestCounts[col];
                if (currentCount > currentBestCount) {
                  bestResults[col] = currentValue;
                  bestCounts[col] = currentCount;
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
          if (
            !this.combinationArrList ||
            !Array.isArray(this.combinationArrList) ||
            this.combinationArrList.length === 0
          ) {
            return;
          }
          this.recomputeAllMade();
        } catch {
          this.clearCache();
          this.madeResultsForward = {};
          this.madeResultsReverse = {};
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
    --cell-min-h: calc(var(--fs-num) * 7);
    --tab-cell-w: 56px;
    --tab-cell-h: 42px;
    --fs-num: clamp(14px, 2.2vw, 16px);
    --cross-w: 44px;
    --cross-h: 40px;
    --cross-item: var(--fs-num);
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
      --tab-cell-w: 48px;
      --tab-cell-h: 36px;
      --cross-w: 36px;
      --cross-h: 32px;
    }
  }
  @media (min-width: 376px) and (max-width: 600px) {
    .my-component-container {
      padding: calc(env(safe-area-inset-top, 0px) + 8px) calc(env(safe-area-inset-left, 0px) + 6px) calc(env(safe-area-inset-bottom, 0px) + 14px) calc(env(safe-area-inset-right, 0px) + 6px);
      --ctrl-h: 34px;
      --tab-cell-w: 52px;
      --tab-cell-h: 40px;
      --cross-w: 40px;
      --cross-h: 36px;
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
  .result-cell {
    container-type: inline-size;
    min-height: var(--cell-min-h);
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 1px;
    box-sizing: border-box;
    background: #fff;
  }
  .result-cell:active {
    background-color: #f5f7fa;
  }
  .result-cell-highlight {
    background-color: #c9ccd0 !important;
  }
  .result-cell-highlight:active {
    background-color: #b0b3b8 !important;
  }
  .tab-window {
    position: relative;
    display: flex;
    gap: 1px;
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
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-sizing: border-box;
    background: #fff;
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
  .tab-cell-active {
    background-color: #c9ccd0 !important;
  }
  .tab-cell-active:active {
    background-color: #b0b3b8 !important;
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
    width: var(--cross-w);
    height: var(--cross-h);
  }
  .tab-cross-item {
    position: absolute;
    width: var(--cross-item);
    height: var(--cross-item);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: calc(var(--cross-item));
    font-weight: 900;
    color: #303133;
    line-height: 1;
  }
  .tab-cross-top {
    top: 0;
    left: calc(50% - calc(var(--cross-item) / 2));
  }
  .tab-cross-right {
    top: calc(50% - calc(var(--cross-item) / 2));
    right: 0;
  }
  .tab-cross-bottom {
    bottom: 0;
    left: calc(50% - calc(var(--cross-item) / 2));
  }
  .tab-cross-left {
    top: calc(50% - calc(var(--cross-item) / 2));
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
