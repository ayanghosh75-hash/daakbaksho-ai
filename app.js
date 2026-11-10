/**
 * DaakBaksho AI (ডাকবাক্স AI) — Professional AI Stenographer Engine
 * 
 * Functions like a seasoned human stenographer/executive secretary:
 * 1. Strictly separates Dictation Content from Meta-Instructions/Commands.
 * 2. Filters out conversational hesitations and filler words ("মানে", "আরে", "উমম", "uh", "um").
 * 3. Understands live Self-Corrections ("কালকে... না না পরশুদিন", "ধুর ভুল বললাম").
 * 4. Stutter / False-Start Removal ("আমি আমি বলছি" -> "আমি বলছি").
 * 5. Intelligent Punctuation:
 *    - Questions ('কী', 'কেন', 'কেমন', 'how', 'why') -> '?'
 *    - Joy/Astonishment ('কী সুন্দর', 'অসাধারণ', 'বাহ') -> '!'
 *    - Standard clauses -> '।' or '.'
 * 6. Non-destructive continuous appending (never wipes text across pauses).
 * 7. Live Fountain Pen tracking & synchronized audio scratching.
 */

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

  // Analyzes and cleans raw spoken utterance like an expert stenographer
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

class DaakBakshoApp {
  constructor() {
    this.currentLang = 'bn-IN';
    this.isRecording = false;
    this.soundEnabled = true;
    this.currentInkColor = '#1e3a8a';
    this.recognition = null;
    this.audioCtx = null;

    // AI Stenographer Engine Instance
    this.stenographer = new StenographerEngine();

    // Committed Sentences History Buffer (Preserves everything across pauses)
    this.committedSentences = [];
    this.interimPhrase = '';

    this.initDOM();
    this.initAudioContext();
    this.initSpeechRecognition();
    this.bindEvents();
    this.updateCurrentDate();
  }

  initDOM() {
    this.elements = {
      micOrbBtn: document.getElementById('micOrbBtn'),
      micActionPrompt: document.getElementById('micActionPrompt'),
      handwritingOutput: document.getElementById('handwritingOutput'),
      fountainPenNib: document.getElementById('fountainPenNib'),
      voiceStatusPill: document.getElementById('voiceStatusPill'),
      voiceStatusText: document.getElementById('voiceStatusText'),
      wordCount: document.getElementById('wordCount'),
      readingTime: document.getElementById('readingTime'),
      currentDateStamp: document.getElementById('currentDateStamp'),
      paperSalutation: document.getElementById('paperSalutation'),
      signerName: document.getElementById('signerName'),
      soundToggleBtn: document.getElementById('soundToggleBtn'),
      assistVoiceBtn: document.getElementById('assistVoiceBtn'),
      downloadJpgBtn: document.getElementById('downloadJpgBtn'),
      downloadVideoBtn: document.getElementById('downloadVideoBtn'),
      langBtns: document.querySelectorAll('.lang-btn'),
      inkBtns: document.querySelectorAll('.ink-color-btn'),
      promptChips: document.querySelectorAll('.prompt-chip'),
      paperArea: document.getElementById('paperArea'),
      exportCanvas: document.getElementById('exportCanvas')
    };
  }

  initAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.audioCtx = new AudioContext();
    }
  }

  // Realistic fountain pen scratch noise synthesized via Web Audio API
  playPenScratchSound() {
    if (!this.soundEnabled || !this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    try {
      const duration = 0.05;
      const bufferSize = this.audioCtx.sampleRate * duration;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = buffer;

      const bandpass = this.audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 2800 + Math.random() * 500;
      bandpass.Q.value = 3.5;

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.09, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      whiteNoise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.audioCtx.destination);

      whiteNoise.start();
    } catch (e) {}
  }

  playChime(type = 'start') {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      const freq = type === 'start' ? 587.33 : (type === 'undo' ? 440 : 880);
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {}
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLang;

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.elements.micOrbBtn.classList.add('recording');
        this.elements.voiceStatusPill.classList.add('active-listening');
        this.elements.micActionPrompt.textContent = 'স্টেনোগ্রাফার শুনছে... মন খুলে বলুন';
        this.elements.voiceStatusText.textContent = '✦ এআই স্টেনোগ্রাফার সক্রিয়: ভুল ও দ্বিধা স্বয়ংক্রিয়ভাবে পরিমার্জিত হচ্ছে';
        this.playChime('start');
      };

      this.recognition.onresult = (event) => {
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0].transcript.trim();

          if (res.isFinal) {
            // First check if it's an explicit voice command
            const isCommand = this.checkAndExecuteVoiceCommand(transcript);
            if (!isCommand) {
              // Pass through AI Stenographer Engine
              const polished = this.stenographer.processUtterance(transcript, this.currentLang);
              if (polished) {
                this.commitSentence(polished);
              }
            }
          } else {
            interim += ' ' + transcript;
          }
        }

        this.interimPhrase = interim.trim();
        this.renderPaperDisplay();
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech error:', e.error);
        if (e.error === 'not-allowed') {
          this.elements.voiceStatusText.textContent = '⚠️ ব্রাউজারে মাইক্রোফোনের অনুমতি দিন';
        }
      };

      this.recognition.onend = () => {
        if (this.isRecording) {
          try { this.recognition.start(); } catch (e) {}
        } else {
          this.elements.micOrbBtn.classList.remove('recording');
          this.elements.voiceStatusPill.classList.remove('active-listening');
          this.elements.micActionPrompt.textContent = 'কথা বলা শুরু করুন';
          this.elements.voiceStatusText.textContent = '✓ স্টেনোগ্রাফার ডিকটেশন সম্পন্ন। ছবি বা রিল ভিডিও ডাউনলোড করতে পারেন।';
          this.playChime('finish');
        }
      };
    } else {
      this.elements.voiceStatusText.textContent = '⚠️ আপনার ব্রাউজার স্পিচ রিকগনিশন সাপোর্ট করে না';
    }
  }

  // Voice Command & Voice Editing Engine
  checkAndExecuteVoiceCommand(transcript) {
    const s = transcript.trim().toLowerCase();

    // 1. Voice Undo / Error Correction: "লাস্ট লাইন কাটো", "মুছে ফেলো", "ভুল হয়েছে"
    if (
      s.includes('মুছে ফেলো') || 
      s.includes('মুছে দাও') || 
      s.includes('লাস্ট লাইন কাটো') || 
      s.includes('শেষ বাক্য কাটো') || 
      s.includes('ভুল হয়েছে') || 
      s.includes('ভুল বললাম') || 
      s.includes('আগেরটা কাটো') || 
      s.includes('undo') || 
      s.includes('delete last')
    ) {
      this.undoLastSentence();
      return true;
    }

    // 2. Clear All / Fresh Paper: "সব মুছে ফেলো", "নতুন কাগজ", "পরিষ্কার করো"
    if (
      s.includes('সব মুছে ফেলো') || 
      s.includes('সব কাটো') || 
      s.includes('নতুন কাগজ') || 
      s.includes('পরিষ্কার করো') || 
      s.includes('clear all') || 
      s.includes('start over')
    ) {
      this.clearPaper();
      return true;
    }

    // 3. In-place Replacement: "বদলে লেখো [X]"
    if (s.startsWith('বদলে লেখো') || s.startsWith('replace with')) {
      const replacement = s.replace(/^বদলে লেখো\s*/i, '').replace(/^replace with\s*/i, '').trim();
      if (replacement) {
        const polished = this.stenographer.processUtterance(replacement, this.currentLang);
        if (polished) {
          this.replaceLastSentence(polished);
        }
        return true;
      }
    }

    // 4. Salutation Voice Edit: "প্রিয় মা", "শ্রদ্ধেয় বাবা"
    if (s.startsWith('প্রিয়') || s.startsWith('শ্রদ্ধেয়') || s.startsWith('স্নেহের') || s.startsWith('dear')) {
      this.elements.paperSalutation.textContent = transcript.trim() + ',';
      this.speakFeedback(`চিঠির শুরুতে ${transcript.trim()} যুক্ত করা হলো।`);
      return true;
    }

    // 5. Signature Voice Edit: "ইতি রাহুল", "স্বাক্ষর অয়ন"
    if (s.startsWith('ইতি') || s.startsWith('স্বাক্ষর') || s.startsWith('from') || s.startsWith('sincerely')) {
      const name = transcript.replace(/^(ইতি|স্বাক্ষর|from|sincerely)\s*/i, '').trim();
      if (name) {
        this.elements.signerName.textContent = name;
        this.speakFeedback(`চিঠির নিচে ইতি ${name} যুক্ত করা হলো।`);
        return true;
      }
    }

    // 6. Ink Color Voice Commands
    if (s.includes('রঙ লাল') || s.includes('লাল কালি')) {
      this.setInkColor('#831843');
      this.speakFeedback('কালির রঙ লাল করা হলো।');
      return true;
    }
    if (s.includes('রঙ নীল') || s.includes('নীল কালি')) {
      this.setInkColor('#1e3a8a');
      this.speakFeedback('কালির রঙ রাজকীয় নীল করা হলো।');
      return true;
    }
    if (s.includes('রঙ কালো') || s.includes('কালো কালি')) {
      this.setInkColor('#0f172a');
      this.speakFeedback('কালির রঙ কালো করা হলো।');
      return true;
    }
    if (s.includes('রঙ বাদামি') || s.includes('সেপিয়া কালি')) {
      this.setInkColor('#7c2d12');
      this.speakFeedback('কালির রঙ সেপিয়া বাদামি করা হলো।');
      return true;
    }

    // 7. Download Voice Commands
    if (s.includes('ছবি ডাউনলোড') || s.includes('ফটো ডাউনলোড')) {
      this.downloadJPG();
      return true;
    }
    if (s.includes('ভিডিও ডাউনলোড') || s.includes('রিল ডাউনলোড')) {
      this.downloadVideo();
      return true;
    }

    return false;
  }

  commitSentence(sentence) {
    if (!sentence) return;
    this.committedSentences.push(sentence);
    this.interimPhrase = '';
    this.renderPaperDisplay(true);
  }

  undoLastSentence() {
    if (this.committedSentences.length > 0) {
      this.committedSentences.pop();
      this.playChime('undo');
      this.speakFeedback('শেষ বাক্যটি মুছে ফেলা হলো।');
      this.renderPaperDisplay(true);
    } else {
      this.speakFeedback('কাগজে মোছার মতো কিছু নেই।');
    }
  }

  clearPaper() {
    this.committedSentences = [];
    this.interimPhrase = '';
    this.elements.handwritingOutput.textContent = 'মুখে কথা বলুন... আপনার প্রতিটি কথা এখানে পুরনো ঝর্ণা কলম নিজের হাতে লিখে দেবে।';
    this.playChime('undo');
    this.speakFeedback('নতুন ফাঁকা কাগজ রাখা হলো।');
    this.updatePenNibPosition();
    this.updateMetrics('');
  }

  replaceLastSentence(newSentence) {
    if (this.committedSentences.length > 0) {
      this.committedSentences.pop();
    }
    this.commitSentence(newSentence);
    this.speakFeedback('বাক্যটি পরিমার্জন করে নতুনভাবে লেখা হলো।');
  }

  speakFeedback(message) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(message);
      u.lang = this.currentLang;
      u.rate = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  renderPaperDisplay(isFinalCommit = false) {
    const fullText = (this.committedSentences.join(' ') + (this.interimPhrase ? ' ' + this.interimPhrase : '')).trim();

    if (!fullText) return;

    this.elements.fountainPenNib.classList.add('writing');
    this.elements.handwritingOutput.textContent = fullText;
    this.playPenScratchSound();
    this.updatePenNibPosition();
    this.updateMetrics(fullText);

    setTimeout(() => {
      this.elements.fountainPenNib.classList.remove('writing');
    }, 200);
  }

  updatePenNibPosition() {
    const output = this.elements.handwritingOutput;
    const rect = output.getBoundingClientRect();
    const paperRect = this.elements.paperArea.getBoundingClientRect();

    const textHeight = Math.min(output.offsetHeight, 320);
    const topOffset = rect.top - paperRect.top + textHeight - 10;
    const leftOffset = Math.min(rect.right - paperRect.left - 30, paperRect.width - 60);

    this.elements.fountainPenNib.style.top = `${Math.max(topOffset, 60)}px`;
    this.elements.fountainPenNib.style.left = `${Math.max(leftOffset, 120)}px`;
  }

  updateMetrics(text) {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    this.elements.wordCount.textContent = `${this.toBengaliNum(words)} শব্দ`;
    const mins = Math.max(1, Math.ceil(words / 120));
    this.elements.readingTime.textContent = `${this.toBengaliNum(mins)} মিনিট পাঠ`;
  }

  toBengaliNum(num) {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bnDigits[d]);
  }

  updateCurrentDate() {
    const now = new Date();
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    this.elements.currentDateStamp.textContent = now.toLocaleDateString('en-GB', options).toUpperCase();
  }

  setInkColor(color) {
    this.currentInkColor = color;
    this.elements.handwritingOutput.style.color = color;
    document.documentElement.style.setProperty('--ink-royal', color);

    this.elements.inkBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
  }

  toggleRecording() {
    if (!this.recognition) {
      alert('অনুগ্রহ করে Google Chrome ব্রাউজার ব্যবহার করুন।');
      return;
    }

    if (this.isRecording) {
      this.isRecording = false;
      this.recognition.stop();
    } else {
      if (this.elements.handwritingOutput.textContent.includes('মুখে কথা বলুন...')) {
        this.elements.handwritingOutput.textContent = '';
      }
      this.recognition.lang = this.currentLang;
      this.recognition.start();
    }
  }

  speakAudioGuidance() {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    let guide = '';
    if (this.currentLang === 'bn-IN') {
      guide = 'নমস্কার! আমি ডাকবাক্স। আমি একজন পেশাদার স্টেনোগ্রাফারের মতো কাজ করি। আপনি কথা বলতে বলতে কোনো ভুল বললে বা দ্বিধা করলে আমি নিজে থেকেই তা ঠিক করে লিখব। কোনো লাইন মুছতে মুখে বলুন "মুছে ফেলো"। কথা শুরু করতে স্ক্রিনে যেকোনো জায়গায় স্পর্শ করুন।';
    } else if (this.currentLang === 'hi-IN') {
      guide = 'नमस्ते! मैं डाकबाक्स का एआई स्टेनोग्राफर हूँ। आपकी गलतियों और हिचकिचाहट को समझकर अपने आप ठीक करूँगा। शुरू करने के लिए टैप करें।';
    } else {
      guide = 'Welcome to DaakBaksho. I act as your personal AI stenographer, filtering hesitations and automatically handling self-corrections. Tap anywhere to begin.';
    }

    const u = new SpeechSynthesisUtterance(guide);
    u.lang = this.currentLang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  // High-Resolution Social Card Export (JPG)
  downloadJPG() {
    const text = this.elements.handwritingOutput.textContent.trim();
    if (!text || text.includes('মুখে কথা বলুন...')) {
      alert('ডাউনলোড করার আগে কিছু কথা বলুন বা লিখুন!');
      return;
    }

    this.elements.downloadJpgBtn.textContent = '⏳ ফটো কার্ড তৈরি হচ্ছে...';

    const canvas = this.elements.exportCanvas;
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    // Parchment background
    ctx.fillStyle = '#faf6ed';
    ctx.fillRect(0, 0, 1080, 1350);

    // Vignette
    const gradient = ctx.createRadialGradient(540, 675, 300, 540, 675, 750);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(180, 160, 120, 0.35)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1350);

    // Border lines
    ctx.strokeStyle = '#c4b590';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 50, 980, 1250);

    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(65, 65, 950, 1220);

    // Postmark
    ctx.save();
    ctx.translate(880, 180);
    ctx.rotate(-0.2);
    ctx.strokeStyle = 'rgba(185, 28, 28, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KOLKATA G.P.O.', 0, -25);
    ctx.font = 'bold 19px "Kalpurush", sans-serif';
    ctx.fillText('ডাকবাক্স', 0, 5);
    ctx.font = '13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(this.elements.currentDateStamp.textContent, 0, 32);
    ctx.restore();

    // Salutation
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 36px "Kalpurush", "Noto Sans Bengali", sans-serif';
    ctx.fillText(this.elements.paperSalutation.textContent, 110, 220);

    // Handwritten Text
    ctx.fillStyle = this.currentInkColor;
    ctx.font = '34px "Kalpurush", "Noto Sans Bengali", sans-serif';
    this.wrapCanvasText(ctx, text, 110, 310, 860, 56);

    // Signature
    ctx.fillStyle = '#78716c';
    ctx.font = '24px "Kalpurush", sans-serif';
    ctx.fillText('ইতির পক্ষে— ' + (this.elements.signerName.textContent || 'আপনার শুভাকাঙ্ক্ষী'), 110, 1180);

    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 20px "Kalpurush", sans-serif';
    ctx.fillText('চিঠির যুগ • ডাকবাক্স AI', 110, 1220);

    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `DaakBaksho_Letter_${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();

      this.elements.downloadJpgBtn.textContent = '✓ ফটো কার্ড ডাউনলোড সম্পন্ন!';
      this.speakFeedback('আপনার ফটো কার্ডটি সফলভাবে ডাউনলোড করা হলো।');
      setTimeout(() => {
        this.elements.downloadJpgBtn.innerHTML = '<span>📸</span> HD ফটো কার্ড (JPG)';
      }, 2500);
    }, 300);
  }

  wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  // Animated Video Reel Recording
  downloadVideo() {
    const text = this.elements.handwritingOutput.textContent.trim();
    if (!text || text.includes('মুখে কথা বলুন...')) {
      alert('ভিডিও রিল বানানোর আগে কিছু কথা বলুন!');
      return;
    }

    this.elements.downloadVideoBtn.textContent = '⏳ অ্যানিমেটেড রিল তৈরি হচ্ছে...';

    const canvas = this.elements.exportCanvas;
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(30);
    let mediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch (e) {
      alert('ভিডিও রেকর্ডার সাপোর্ট নেই।');
      this.elements.downloadVideoBtn.innerHTML = '<span>🎥</span> অ্যানিমেটেড রিল ভিডিও (MP4)';
      return;
    }

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DaakBaksho_Reel_${Date.now()}.webm`;
      a.click();

      this.elements.downloadVideoBtn.textContent = '✓ রিল ডাউনলোড সম্পন্ন!';
      this.speakFeedback('আপনার অ্যানিমেটেড রিল ভিডিওটি সফলভাবে ডাউনলোড হয়েছে।');
      setTimeout(() => {
        this.elements.downloadVideoBtn.innerHTML = '<span>🎥</span> অ্যানিমেটেড রিল ভিডিও (MP4)';
      }, 2500);
    };

    mediaRecorder.start();

    let frame = 0;
    const totalFrames = 90;

    const animInterval = setInterval(() => {
      frame++;

      ctx.fillStyle = '#faf6ed';
      ctx.fillRect(0, 0, 720, 1280);

      ctx.fillStyle = 'rgba(180, 150, 110, 0.2)';
      ctx.fillRect(0, 0, 720, 1280);

      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 640, 1200);

      // Waveform bars
      ctx.fillStyle = '#b91c1c';
      for (let i = 0; i < 28; i++) {
        const barHeight = Math.sin(frame * 0.2 + i * 0.4) * 25 + 30;
        ctx.fillRect(100 + i * 18, 1050 - barHeight / 2, 8, barHeight);
      }

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 30px "Kalpurush", sans-serif';
      ctx.fillText('ডাকবাক্স AI • অডিও স্মৃতিকথা', 80, 160);

      const charLimit = Math.floor((frame / totalFrames) * text.length);
      const visibleText = text.substring(0, charLimit);

      ctx.fillStyle = this.currentInkColor;
      ctx.font = '28px "Kalpurush", "Noto Sans Bengali", sans-serif';
      this.wrapCanvasText(ctx, visibleText, 80, 260, 560, 48);

      if (frame >= totalFrames) {
        clearInterval(animInterval);
        mediaRecorder.stop();
      }
    }, 33);
  }

  bindEvents() {
    this.elements.micOrbBtn.addEventListener('click', () => this.toggleRecording());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.toggleRecording();
      }
    });

    this.elements.soundToggleBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.elements.soundToggleBtn.innerHTML = this.soundEnabled
        ? '<span class="icon">🔊</span> খসখস শব্দ চালু'
        : '<span class="icon">🔇</span> খসখস শব্দ বন্ধ';
    });

    this.elements.assistVoiceBtn.addEventListener('click', () => this.speakAudioGuidance());

    this.elements.langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentLang = btn.dataset.lang;
        this.elements.langBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (this.recognition) {
          this.recognition.lang = this.currentLang;
        }

        this.speakAudioGuidance();
      });
    });

    this.elements.inkBtns.forEach(btn => {
      btn.addEventListener('click', () => this.setInkColor(btn.dataset.color));
    });

    this.elements.promptChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.text;
        const polished = this.stenographer.processUtterance(text, this.currentLang);
        if (polished) {
          this.commitSentence(polished);
        }
      });
    });

    this.elements.downloadJpgBtn.addEventListener('click', () => this.downloadJPG());
    this.elements.downloadVideoBtn.addEventListener('click', () => this.downloadVideo());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new DaakBakshoApp();
});
