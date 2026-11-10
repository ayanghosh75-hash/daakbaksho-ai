class StenographerEngine {
  constructor() {
    this.fillerWords = [
      'উমম', 'উম্ম', 'আরে', 'মানে বলছি যে', 'মানে', 'দাঁড়াও', 'দাড়াও', 
      'ধুর', 'শোনো', 'হুম', 'হুঁ', 'uh', 'um', 'umm', 'er', 'you know'
    ];

    this.bnQuestionWords = [
      'কী', 'কি', 'কেন', 'কোথায়', 'কোথাকার', 'কেমন', 'কবে', 'কখন', 
      'কার', 'কাকে', 'কারা', 'কতো', 'কত', 'কোনটি', 'কোনটা', 'কে'
    ];

    this.hiQuestionWords = [
      'क्या', 'क्यों', 'कहाँ', 'कैसे', 'कब', 'किसका', 'किसे', 'कौन', 'कितना'
    ];

    this.enQuestionWords = [
      'what', 'why', 'where', 'how', 'when', 'who', 'whom', 'whose', 
      'which', 'is', 'are', 'can', 'could', 'would', 'should', 'will', 'do', 'does', 'did'
    ];

    this.exclamationWords = [
      'কী সুন্দর', 'কি সুন্দর', 'কী দারুণ', 'কি দারুণ', 'কী চমৎকার', 'কি চমৎকার',
      'অসাধারণ', 'দারুণ', 'বাহ', 'আহা', 'সাবাশ', 'ধন্যবাদ', 'ভালোবাসি', 'মুগ্ধ', 
      'সুন্দর', 'wow', 'amazing', 'great', 'wonderful', 'hurrah', 'bravo'
    ];
  }

  processUtterance(rawText, currentLanguage) {
    if (!rawText) return null;
    let s = rawText.trim();

    // 1. Self-Correction Logic ("কালকে... না না পরশু" / "মানে ভুল হলো")
    const correctionMatch = s.match(/(.*?)(?:\s+না\s+না|\s+না\s+আসলে|\s+ধুর\s+ভুল\s+হলো|\s+ভুল\s+বললাম)\s+(.*)/i);
    if (correctionMatch) {
      s = correctionMatch[2].trim();
    }

    // 2. Clean Stutters / Consecutive duplicate words ("আমি আমি যাব" -> "আমি যাব")
    const rawTokens = s.split(/\s+/);
    const dedupedTokens = [];
    for (let i = 0; i < rawTokens.length; i++) {
      if (i === 0 || rawTokens[i].toLowerCase() !== rawTokens[i - 1].toLowerCase()) {
        dedupedTokens.push(rawTokens[i]);
      }
    }
    s = dedupedTokens.join(' ');

    // 3. Strip conversational hesitations & filler words
    const words = s.split(/\s+/);
    const cleanedWords = words.filter((w, idx) => {
      const lower = w.toLowerCase().replace(/[,\.।]/g, '');
      return words.length <= 1 || !this.fillerWords.includes(lower);
    });

    s = cleanedWords.join(' ').trim();
    if (!s) return null;

    // 4. Intelligent Punctuation Detection
    s = s.replace(/[।\.\?\,\!]+$/, ''); // clear trailing punctuation
    const lower = s.toLowerCase();

    // Check Exclamation FIRST (e.g. "কী সুন্দর দৃশ্য" is exclamation, not question)
    const isExclamation = this.exclamationWords.some(e => lower.includes(e));

    // Is it a Question?
    const isQuestion = !isExclamation && (
      this.bnQuestionWords.some(q => lower.split(/\s+/).includes(q) || lower.startsWith(q + ' ')) ||
      this.hiQuestionWords.some(q => lower.split(/\s+/).includes(q) || lower.startsWith(q + ' ')) ||
      this.enQuestionWords.some(q => lower.split(/\s+/)[0] === q)
    );

    if (isExclamation) {
      s += '!';
    } else if (isQuestion) {
      s += '?';
    } else {
      s += (currentLanguage === 'bn-IN' || currentLanguage === 'hi-IN') ? '।' : '.';
    }

    // Capitalize first letter if English
    if (currentLanguage === 'en-US' && s.length > 0) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
    }

    return s;
  }
}

const engine = new StenographerEngine();

const tests = [
  { raw: 'মা কেমন আছো', expected: 'মা কেমন আছো?' },
  { raw: 'তুমি কি বাড়ি ফিরবে', expected: 'তুমি কি বাড়ি ফিরবে?' },
  { raw: 'আরে উমম আমি ভালো আছি', expected: 'আমি ভালো আছি।' },
  { raw: 'আমি আমি কালকে যাব', expected: 'আমি কালকে যাব।' },
  { raw: 'আমি কালকে যাব না না পরশুদিন যাব', expected: 'পরশুদিন যাব।' },
  { raw: 'কী সুন্দর দৃশ্য', expected: 'কী সুন্দর দৃশ্য!' },
  { raw: 'how are you doing today', expected: 'How are you doing today?' },
  { raw: 'this is a beautiful letter', expected: 'This is a beautiful letter.' }
];

console.log('--- RUNNING REFINED STENOGRAPHER TESTS ---');
let allPassed = true;
tests.forEach((t, i) => {
  const isEn = /^[a-z]/i.test(t.raw);
  const result = engine.processUtterance(t.raw, isEn ? 'en-US' : 'bn-IN');
  const pass = result === t.expected;
  if (!pass) allPassed = false;
  console.log('Test ' + (i+1) + ': Input="' + t.raw + '" => Output="' + result + '" | ' + (pass ? 'PASS ✓' : 'FAIL ✗'));
});
console.log('Overall Status:', allPassed ? 'ALL 8 TESTS PASSED PERFECTLY! 🎉' : 'SOME TESTS FAILED');
