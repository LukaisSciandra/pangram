'use strict';

/* ── State ─────────────────────────────────────────────── */
let wordList = [];

/* ── DOM refs ──────────────────────────────────────────── */
const boxes        = Array.from(document.querySelectorAll('.letter-box'));
const btnSolve     = document.getElementById('btn-solve');
const btnClear     = document.getElementById('btn-clear');
const errorMsg  = document.getElementById('error-msg');
const loadingEl = document.getElementById('loading-overlay');

const resultsSection   = document.getElementById('results-section');
const noResultsSection = document.getElementById('no-results-section');
const resultsCount     = document.getElementById('results-count');
const resultsLetters   = document.getElementById('results-letters');
const wordGrid         = document.getElementById('word-grid');

/* ── Load word list ────────────────────────────────────── */
async function loadWords() {
  try {
    const res  = await fetch('/words.txt');
    const text = await res.text();
    wordList = text
      .split('\n')
      .map(w => w.trim().toLowerCase())
      .filter(w => /^[a-z]{7,}$/.test(w));
  } catch (err) {
    console.error('Could not load words.txt:', err);
    errorMsg.textContent = 'Failed to load word list. Please refresh.';
  } finally {
    loadingEl.classList.add('hidden');
  }
}

/* ── Pangram check ─────────────────────────────────────── */
// A pangram must contain every letter in letterSet at least once
// and may only contain letters from letterSet.
function isPangram(word, letterSet) {
  for (const ch of letterSet) {
    if (!word.includes(ch)) return false;
  }
  for (const ch of word) {
    if (!letterSet.has(ch)) return false;
  }
  return true;
}

function findPangrams(letters) {
  const letterSet = new Set(letters);
  return wordList.filter(w => isPangram(w, letterSet));
}

/* ── Input helpers ─────────────────────────────────────── */
function getLetters() {
  return boxes.map(b => b.value.trim().toLowerCase()).filter(Boolean);
}

function isReady() {
  return getLetters().length === 7;
}

function hasDuplicates(letters) {
  return new Set(letters).size < letters.length;
}

function validate() {
  const letters = getLetters();
  clearError();

  if (letters.length < 7) {
    return false;
  }
  if (hasDuplicates(letters)) {
    showError('All 7 letters must be unique.');
    return false;
  }
  return true;
}

function showError(msg) {
  errorMsg.textContent = msg;
}

function clearError() {
  errorMsg.textContent = '';
}

function updateBoxStyles() {
  const letters = getLetters();
  const seen = {};
  // Tally which letters appear in filled boxes
  boxes.forEach(b => {
    const v = b.value.trim().toLowerCase();
    if (v) seen[v] = (seen[v] || 0) + 1;
  });

  boxes.forEach(b => {
    const v = b.value.trim().toLowerCase();
    b.classList.toggle('filled', v.length === 1);
    b.classList.toggle('duplicate', v.length === 1 && seen[v] > 1);
  });

  btnSolve.disabled = !isReady() || hasDuplicates(letters);
}

/* ── Render results ────────────────────────────────────── */
function renderResults(pangrams, letters) {
  wordGrid.innerHTML      = '';
  resultsLetters.innerHTML = '';

  resultsSection.hidden   = pangrams.length === 0;
  noResultsSection.hidden = pangrams.length > 0;

  if (pangrams.length === 0) return;

  // Letter chips
  letters.forEach(ch => {
    const chip = document.createElement('span');
    chip.className   = 'results-chip';
    chip.textContent = ch;
    resultsLetters.appendChild(chip);
  });

  // Count label
  resultsCount.textContent = `${pangrams.length} word${pangrams.length === 1 ? '' : 's'} found`;

  // Sort alphabetically then by length
  pangrams.sort((a, b) => a.length - b.length || a.localeCompare(b));

  pangrams.forEach(word => {
    const chip = document.createElement('span');
    chip.className   = 'word-chip';
    chip.textContent = word;
    wordGrid.appendChild(chip);
  });
}

/* ── Event: letter boxes ───────────────────────────────── */
boxes.forEach((box, i) => {
  box.addEventListener('input', e => {
    // Allow only letters
    const raw = e.target.value.replace(/[^a-zA-Z]/g, '');
    e.target.value = raw.slice(-1).toLowerCase();

    updateBoxStyles();
    clearError();

    // Auto-advance
    if (e.target.value && i < boxes.length - 1) {
      boxes[i + 1].focus();
    }
  });

  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !box.value && i > 0) {
      boxes[i - 1].focus();
    }
    if (e.key === 'Enter' && !btnSolve.disabled) {
      btnSolve.click();
    }
  });

  // Prevent pasting more than 1 char per box; handle full 7-char paste
  box.addEventListener('paste', e => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)
      .getData('text')
      .replace(/[^a-zA-Z]/g, '')
      .toLowerCase()
      .slice(0, 7);

    if (pasted.length === 7) {
      // Fill all boxes from paste
      pasted.split('').forEach((ch, idx) => {
        if (boxes[idx]) boxes[idx].value = ch;
      });
    } else {
      box.value = pasted.slice(0, 1);
    }
    updateBoxStyles();
  });
});

/* ── Event: Solve ──────────────────────────────────────── */
btnSolve.addEventListener('click', () => {
  if (!validate()) return;

  const letters  = getLetters();
  const pangrams = findPangrams(letters);

  renderResults(pangrams, letters);

  // Scroll to results
  const target = pangrams.length > 0 ? resultsSection : noResultsSection;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ── Event: Clear ──────────────────────────────────────── */
btnClear.addEventListener('click', () => {
  boxes.forEach(b => { b.value = ''; b.classList.remove('filled', 'duplicate'); });
  btnSolve.disabled = true;
  clearError();
  resultsSection.hidden   = true;
  noResultsSection.hidden = true;
  boxes[0].focus();
});

/* ── Boot ──────────────────────────────────────────────── */
loadWords();
boxes[0].focus();
