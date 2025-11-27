/**
 * German A-Level Vocabulary Trainer
 * For Cambridge 9897 German Preparation
 * With Spaced Repetition & Progress Tracking
 */

// Firebase Configuration (using existing ISN Movember project)
const firebaseConfig = {
    apiKey: "AIzaSyDXEMGKw3g24o0a-fkrD7ywk_MOuTtZJeY",
    authDomain: "isn-movember.firebaseapp.com",
    databaseURL: "https://isn-movember-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "isn-movember",
    storageBucket: "isn-movember.firebasestorage.app",
    messagingSenderId: "397597913187",
    appId: "1:397597913187:web:333e00f47ee6414f348856"
};

// =====================================================
// STUDENT CONFIGURATION - Change this for each student
// =====================================================
const STUDENT_ID = 'student-turkish-alevel'; // Unique ID for this student's data

// App State
const AppState = {
    vocabulary: [],
    userProgress: {},
    currentQueue: [],
    currentIndex: 0,
    currentWord: null,
    isFlipped: false,
    dailyGoal: 30,
    todayWords: 0,
    streak: 0,
    totalReviews: 0,
    correctAnswers: 0,
    lastStudyDate: null,
    studyHistory: {},
    activeFilter: 'due',
    activeTab: 'flashcards',
    quizType: 'turkish-german',
    matchPairs: [],
    selectedMatchItem: null,
    wordListPage: 1,
    wordListFilter: 'all',
    activityChart: null,
    levelChart: null,
    userId: STUDENT_ID
};

// Exam Date
const EXAM_DATE = new Date('2026-05-24');

// Mastery Levels
const MASTERY_LEVELS = {
    0: { name: 'Yeni', color: '#ef4444', nextReview: 0 },
    1: { name: 'Görüldü', color: '#f97316', nextReview: 1 },
    2: { name: 'Öğreniliyor', color: '#eab308', nextReview: 3 },
    3: { name: 'Tanıdık', color: '#84cc16', nextReview: 7 },
    4: { name: 'Ustalaşılan', color: '#22c55e', nextReview: 30 }
};

// Encouragement Messages
const ENCOURAGEMENTS = [
    { icon: '💪', text: 'Her kelime seni A-Level başarısına bir adım daha yaklaştırıyor!' },
    { icon: '🌟', text: 'Harika gidiyorsun! Düzenli çalışma başarının anahtarı.' },
    { icon: '🎯', text: 'Hedefine odaklan! Cambridge 9897 seni bekliyor.' },
    { icon: '🚀', text: 'Bu tempoda sınava çok iyi hazırlanacaksın!' },
    { icon: '📚', text: 'Bilgi güçtür. Her yeni kelime yeni bir kapı açar.' },
    { icon: '🏆', text: 'Şampiyon gibi çalışıyorsun! Devam et!' },
    { icon: '✨', text: 'İlerleme kaydediyorsun. Kendini tebrik et!' },
    { icon: '🔥', text: 'Serini koru! Süreklilik mükemmelliği getirir.' },
    { icon: '🌈', text: 'Zor kelimeler bile zamanla kolay gelecek.' },
    { icon: '💎', text: 'Her gün biraz daha iyi oluyorsun!' }
];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
});

function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        setTimeout(initializeFirebase, 500);
        return;
    }

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    // Load user progress from Firebase
    loadUserProgress(database);
    
    // Store database reference globally
    window.db = database;
}

function loadUserProgress(database) {
    database.ref(`vocab-trainer/${AppState.userId}`).once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                AppState.userProgress = data.wordProgress || {};
                AppState.dailyGoal = data.dailyGoal || 30;
                AppState.streak = data.streak || 0;
                AppState.totalReviews = data.totalReviews || 0;
                AppState.correctAnswers = data.correctAnswers || 0;
                AppState.lastStudyDate = data.lastStudyDate || null;
                AppState.studyHistory = data.studyHistory || {};
            }
            initializeApp();
        })
        .catch((error) => {
            console.error('Error loading progress:', error);
            initializeApp();
        });
}

function saveUserProgress() {
    if (!window.db) return;
    
    const progressData = {
        wordProgress: AppState.userProgress,
        dailyGoal: AppState.dailyGoal,
        streak: AppState.streak,
        totalReviews: AppState.totalReviews,
        correctAnswers: AppState.correctAnswers,
        lastStudyDate: AppState.lastStudyDate,
        studyHistory: AppState.studyHistory,
        lastUpdated: new Date().toISOString()
    };
    
    window.db.ref(`vocab-trainer/${AppState.userId}`).set(progressData)
        .catch((error) => console.error('Error saving progress:', error));
}

function initializeApp() {
    // Load vocabulary
    AppState.vocabulary = VOCABULARY_DATA.map(word => ({
        ...word,
        mastery: AppState.userProgress[word.id]?.mastery || 0,
        lastReview: AppState.userProgress[word.id]?.lastReview || null,
        reviewCount: AppState.userProgress[word.id]?.reviewCount || 0
    }));
    
    // Check streak
    checkStreak();
    
    // Calculate today's words
    calculateTodayWords();
    
    // Initialize queue
    buildStudyQueue();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update UI
    updateAllStats();
    updateExamCountdown();
    updateDistributionBar();
    updateHeatmap();
    updateEncouragement();
    showCurrentCard();
    
    // Hide loading overlay
    document.getElementById('loadingOverlay').style.display = 'none';
}

function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.activeFilter = btn.dataset.filter;
            buildStudyQueue();
            showCurrentCard();
        });
    });
    
    // Quiz type buttons
    document.querySelectorAll('.filter-btn[data-quiz-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-quiz-type]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.quizType = btn.dataset.quizType;
            generateQuizQuestion();
        });
    });
    
    // Word list filter buttons
    document.querySelectorAll('.filter-btn[data-list-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-list-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.wordListFilter = btn.dataset.listFilter;
            AppState.wordListPage = 1;
            renderWordList();
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(e) {
    if (AppState.activeTab !== 'flashcards') return;
    
    switch(e.key) {
        case ' ':
        case 'Enter':
            e.preventDefault();
            flipCard();
            break;
        case '1':
            if (AppState.isFlipped) rateWord(0);
            break;
        case '2':
            if (AppState.isFlipped) rateWord(1);
            break;
        case '3':
            if (AppState.isFlipped) rateWord(2);
            break;
        case 'ArrowRight':
            skipWord();
            break;
    }
}

function switchTab(tabName) {
    AppState.activeTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Show/hide panels
    document.getElementById('flashcardPanel').style.display = tabName === 'flashcards' ? 'block' : 'none';
    document.getElementById('quizPanel').style.display = tabName === 'quiz' ? 'block' : 'none';
    document.getElementById('matchPanel').style.display = tabName === 'match' ? 'block' : 'none';
    document.getElementById('wordListPanel').style.display = tabName === 'wordlist' ? 'block' : 'none';
    document.getElementById('statsPanel').style.display = tabName === 'stats' ? 'block' : 'none';
    
    // Initialize specific modes
    if (tabName === 'quiz') generateQuizQuestion();
    if (tabName === 'match') newMatchGame();
    if (tabName === 'wordlist') renderWordList();
    if (tabName === 'stats') renderCharts();
}

// ============ FLASHCARD MODE ============

function buildStudyQueue() {
    const now = new Date();
    const today = now.toDateString();
    
    let filtered = [...AppState.vocabulary];
    
    switch(AppState.activeFilter) {
        case 'due':
            filtered = filtered.filter(word => {
                if (word.mastery === 0) return true;
                if (!word.lastReview) return true;
                const lastReview = new Date(word.lastReview);
                const daysSince = Math.floor((now - lastReview) / (1000 * 60 * 60 * 24));
                return daysSince >= MASTERY_LEVELS[word.mastery].nextReview;
            });
            break;
        case 'new':
            filtered = filtered.filter(word => word.mastery === 0);
            break;
        case 'b2':
            filtered = filtered.filter(word => word.level === 'B2');
            break;
        case 'c1':
            filtered = filtered.filter(word => word.level === 'C1');
            break;
    }
    
    // Sort: lower mastery first, then by last review (oldest first)
    filtered.sort((a, b) => {
        if (a.mastery !== b.mastery) return a.mastery - b.mastery;
        if (!a.lastReview) return -1;
        if (!b.lastReview) return 1;
        return new Date(a.lastReview) - new Date(b.lastReview);
    });
    
    AppState.currentQueue = filtered;
    AppState.currentIndex = 0;
}

function showCurrentCard() {
    if (AppState.currentQueue.length === 0) {
        showEmptyState();
        return;
    }
    
    AppState.currentWord = AppState.currentQueue[AppState.currentIndex];
    AppState.isFlipped = false;
    
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.remove('flipped');
    
    // Update front (Turkish)
    document.getElementById('turkishWord').textContent = AppState.currentWord.turkish;
    document.getElementById('turkishInfo').textContent = `${AppState.currentWord.level} • Tekrar: ${AppState.currentWord.reviewCount}`;
    
    // Update back (German)
    document.getElementById('germanWord').textContent = AppState.currentWord.german;
    document.getElementById('germanInfo').textContent = getWordTypeFromGerman(AppState.currentWord.german);
    
    // Update level badges
    const level = AppState.currentWord.mastery;
    const levelInfo = MASTERY_LEVELS[level];
    const levelBadgeHTML = `<span style="background: ${levelInfo.color}20; color: ${levelInfo.color}">${levelInfo.name}</span>`;
    
    document.getElementById('wordLevel').innerHTML = levelBadgeHTML;
    document.getElementById('wordLevel').style.background = `${levelInfo.color}20`;
    document.getElementById('wordLevel').style.color = levelInfo.color;
    
    document.getElementById('wordLevelBack').innerHTML = levelBadgeHTML;
    document.getElementById('wordLevelBack').style.background = `${levelInfo.color}20`;
    document.getElementById('wordLevelBack').style.color = levelInfo.color;
    
    // Update card numbers
    const cardNum = `${AppState.currentIndex + 1} / ${AppState.currentQueue.length}`;
    document.getElementById('cardNumber').textContent = cardNum;
    document.getElementById('cardNumberBack').textContent = cardNum;
    
    // Hide response buttons
    document.getElementById('responseButtons').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('turkishWord').textContent = 'Tebrikler! 🎉';
    document.getElementById('turkishInfo').textContent = 'Bu kategoride tekrar edilecek kelime kalmadı.';
    document.getElementById('wordLevel').textContent = '';
    document.getElementById('cardNumber').textContent = '0 / 0';
    document.getElementById('responseButtons').style.display = 'none';
}

function getWordTypeFromGerman(word) {
    if (word.startsWith('der ')) return 'Erkek isim (maskulin)';
    if (word.startsWith('die ')) return 'Dişi isim (feminin)';
    if (word.startsWith('das ')) return 'Nötr isim (neutral)';
    if (word.match(/^[a-z]/)) return 'Fiil / Sıfat';
    return '';
}

function flipCard() {
    if (AppState.currentQueue.length === 0) return;
    
    AppState.isFlipped = !AppState.isFlipped;
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.toggle('flipped', AppState.isFlipped);
    
    // Show response buttons when flipped
    document.getElementById('responseButtons').style.display = AppState.isFlipped ? 'grid' : 'none';
}

function rateWord(rating) {
    if (!AppState.currentWord) return;
    
    const word = AppState.currentWord;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Update mastery based on rating
    if (rating === 0) {
        // Wrong - decrease mastery
        word.mastery = Math.max(0, word.mastery - 1);
    } else if (rating === 1) {
        // Hard - keep same level
        // No change to mastery
    } else if (rating === 2) {
        // Good - increase mastery
        word.mastery = Math.min(4, word.mastery + 1);
        AppState.correctAnswers++;
    }
    
    word.lastReview = now.toISOString();
    word.reviewCount++;
    
    // Update progress
    AppState.userProgress[word.id] = {
        mastery: word.mastery,
        lastReview: word.lastReview,
        reviewCount: word.reviewCount
    };
    
    // Update stats
    AppState.totalReviews++;
    AppState.todayWords++;
    AppState.lastStudyDate = today;
    
    // Update study history
    if (!AppState.studyHistory[today]) {
        AppState.studyHistory[today] = 0;
    }
    AppState.studyHistory[today]++;
    
    // Save progress
    saveUserProgress();
    
    // Check achievements
    checkAchievements();
    
    // Update UI
    updateAllStats();
    updateDistributionBar();
    updateHeatmap();
    
    // Move to next card
    moveToNextCard();
}

function moveToNextCard() {
    // Remove current card from queue if mastered or move to end
    if (AppState.currentWord.mastery >= 2) {
        AppState.currentQueue.splice(AppState.currentIndex, 1);
    } else {
        // Move to end of queue for more practice
        const word = AppState.currentQueue.splice(AppState.currentIndex, 1)[0];
        AppState.currentQueue.push(word);
    }
    
    // Adjust index if needed
    if (AppState.currentIndex >= AppState.currentQueue.length) {
        AppState.currentIndex = 0;
    }
    
    showCurrentCard();
}

function skipWord() {
    if (AppState.currentQueue.length <= 1) return;
    
    // Move current to end
    const word = AppState.currentQueue.splice(AppState.currentIndex, 1)[0];
    AppState.currentQueue.push(word);
    
    showCurrentCard();
}

function shuffleQueue() {
    for (let i = AppState.currentQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [AppState.currentQueue[i], AppState.currentQueue[j]] = [AppState.currentQueue[j], AppState.currentQueue[i]];
    }
    AppState.currentIndex = 0;
    showCurrentCard();
}

// ============ QUIZ MODE ============

function generateQuizQuestion() {
    const quizPanel = document.getElementById('quizPanel');
    if (quizPanel.style.display === 'none') return;
    
    // Get random word
    const randomWords = [...AppState.vocabulary].sort(() => Math.random() - 0.5);
    const questionWord = randomWords[0];
    
    // Get 3 wrong answers
    const wrongAnswers = randomWords.slice(1, 4);
    
    // Create options
    let options;
    if (AppState.quizType === 'turkish-german') {
        document.getElementById('quizQuestion').textContent = questionWord.turkish;
        options = [
            { text: questionWord.german, correct: true },
            ...wrongAnswers.map(w => ({ text: w.german, correct: false }))
        ];
    } else {
        document.getElementById('quizQuestion').textContent = questionWord.german;
        options = [
            { text: questionWord.turkish, correct: true },
            ...wrongAnswers.map(w => ({ text: w.turkish, correct: false }))
        ];
    }
    
    // Shuffle options
    options.sort(() => Math.random() - 0.5);
    
    // Render options
    const container = document.getElementById('quizOptions');
    container.innerHTML = options.map((opt, i) => `
        <button class="quiz-option" data-correct="${opt.correct}" onclick="selectQuizOption(this)">
            ${opt.text}
        </button>
    `).join('');
    
    // Store correct word for progress tracking
    AppState.currentQuizWord = questionWord;
}

function selectQuizOption(button) {
    const isCorrect = button.dataset.correct === 'true';
    
    // Mark all buttons
    document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.correct === 'true') {
            btn.classList.add('correct');
        } else if (btn === button && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });
    
    // Update progress
    if (AppState.currentQuizWord) {
        const word = AppState.vocabulary.find(w => w.id === AppState.currentQuizWord.id);
        if (word) {
            if (isCorrect) {
                word.mastery = Math.min(4, word.mastery + 1);
                AppState.correctAnswers++;
                
                // Small confetti for correct answer
                confetti({
                    particleCount: 30,
                    spread: 50,
                    origin: { y: 0.7 }
                });
            } else {
                word.mastery = Math.max(0, word.mastery - 1);
            }
            
            word.lastReview = new Date().toISOString();
            word.reviewCount++;
            
            AppState.userProgress[word.id] = {
                mastery: word.mastery,
                lastReview: word.lastReview,
                reviewCount: word.reviewCount
            };
            
            AppState.totalReviews++;
            AppState.todayWords++;
            
            const today = new Date().toISOString().split('T')[0];
            if (!AppState.studyHistory[today]) {
                AppState.studyHistory[today] = 0;
            }
            AppState.studyHistory[today]++;
            
            saveUserProgress();
            updateAllStats();
        }
    }
}

function nextQuizQuestion() {
    generateQuizQuestion();
}

// ============ MATCH MODE ============

function newMatchGame() {
    // Get 5 random words
    const randomWords = [...AppState.vocabulary]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
    
    AppState.matchPairs = randomWords.map(w => ({
        id: w.id,
        turkish: w.turkish,
        german: w.german,
        matched: false
    }));
    
    AppState.selectedMatchItem = null;
    
    // Render Turkish column
    const turkishColumn = document.getElementById('matchTurkish');
    turkishColumn.innerHTML = AppState.matchPairs
        .map(p => `
            <div class="match-item" data-id="${p.id}" data-type="turkish" onclick="selectMatchItem(this)">
                ${p.turkish}
            </div>
        `).join('');
    
    // Render German column (shuffled)
    const shuffledGerman = [...AppState.matchPairs].sort(() => Math.random() - 0.5);
    const germanColumn = document.getElementById('matchGerman');
    germanColumn.innerHTML = shuffledGerman
        .map(p => `
            <div class="match-item" data-id="${p.id}" data-type="german" onclick="selectMatchItem(this)">
                ${p.german}
            </div>
        `).join('');
    
    document.getElementById('matchResult').textContent = '';
}

function selectMatchItem(element) {
    if (element.classList.contains('matched')) return;
    
    const id = element.dataset.id;
    const type = element.dataset.type;
    
    if (!AppState.selectedMatchItem) {
        // First selection
        AppState.selectedMatchItem = { id, type, element };
        element.classList.add('selected');
    } else if (AppState.selectedMatchItem.type === type) {
        // Same column - switch selection
        AppState.selectedMatchItem.element.classList.remove('selected');
        AppState.selectedMatchItem = { id, type, element };
        element.classList.add('selected');
    } else {
        // Different column - check match
        const isMatch = AppState.selectedMatchItem.id === id;
        
        if (isMatch) {
            // Correct match
            element.classList.add('matched');
            AppState.selectedMatchItem.element.classList.add('matched');
            AppState.selectedMatchItem.element.classList.remove('selected');
            
            // Update progress
            const word = AppState.vocabulary.find(w => w.id === parseInt(id));
            if (word) {
                word.mastery = Math.min(4, word.mastery + 1);
                word.lastReview = new Date().toISOString();
                word.reviewCount++;
                AppState.userProgress[word.id] = {
                    mastery: word.mastery,
                    lastReview: word.lastReview,
                    reviewCount: word.reviewCount
                };
                AppState.correctAnswers++;
                AppState.totalReviews++;
                AppState.todayWords++;
                saveUserProgress();
                updateAllStats();
            }
            
            // Check if all matched
            const allMatched = AppState.matchPairs.every(p => {
                const turkishEl = document.querySelector(`.match-item[data-id="${p.id}"][data-type="turkish"]`);
                return turkishEl && turkishEl.classList.contains('matched');
            });
            
            if (allMatched) {
                document.getElementById('matchResult').innerHTML = '🎉 Harika! Tümünü eşleştirdin!';
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        } else {
            // Wrong match
            element.classList.add('wrong');
            AppState.selectedMatchItem.element.classList.add('wrong');
            
            setTimeout(() => {
                element.classList.remove('wrong');
                AppState.selectedMatchItem.element.classList.remove('wrong', 'selected');
                AppState.selectedMatchItem = null;
            }, 500);
            
            return;
        }
        
        AppState.selectedMatchItem = null;
    }
}

// ============ WORD LIST ============

function renderWordList() {
    let filtered = [...AppState.vocabulary];
    
    // Apply filter
    if (AppState.wordListFilter !== 'all') {
        const level = parseInt(AppState.wordListFilter);
        filtered = filtered.filter(w => w.mastery === level);
    }
    
    // Apply search
    const searchTerm = document.getElementById('wordSearch')?.value?.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(w => 
            w.german.toLowerCase().includes(searchTerm) ||
            w.turkish.toLowerCase().includes(searchTerm)
        );
    }
    
    // Pagination
    const perPage = 50;
    const totalPages = Math.ceil(filtered.length / perPage);
    const start = (AppState.wordListPage - 1) * perPage;
    const pageWords = filtered.slice(start, start + perPage);
    
    // Render table
    const tbody = document.getElementById('wordTableBody');
    tbody.innerHTML = pageWords.map(word => {
        const levelInfo = MASTERY_LEVELS[word.mastery];
        return `
            <tr>
                <td style="font-weight: 500;">${word.german}</td>
                <td>${word.turkish}</td>
                <td>
                    <span class="word-level-badge" style="background: ${levelInfo.color}20; color: ${levelInfo.color};">
                        ${levelInfo.name}
                    </span>
                </td>
                <td>${word.level}</td>
            </tr>
        `;
    }).join('');
    
    // Render pagination
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('wordListPagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        const active = i === AppState.wordListPage ? 'active' : '';
        html += `<button class="nav-btn ${active}" onclick="goToPage(${i})">${i}</button>`;
    }
    container.innerHTML = html;
}

function goToPage(page) {
    AppState.wordListPage = page;
    renderWordList();
}

function filterWordList() {
    AppState.wordListPage = 1;
    renderWordList();
}

// ============ STATISTICS ============

function updateAllStats() {
    // Calculate stats
    const mastered = AppState.vocabulary.filter(w => w.mastery >= 4).length;
    const accuracy = AppState.totalReviews > 0 
        ? Math.round((AppState.correctAnswers / AppState.totalReviews) * 100) 
        : 0;
    
    // Update display
    document.getElementById('streakCount').textContent = AppState.streak;
    document.getElementById('todayWords').textContent = AppState.todayWords;
    document.getElementById('masteredWords').textContent = mastered;
    document.getElementById('totalReviews').textContent = AppState.totalReviews;
    document.getElementById('accuracyRate').textContent = accuracy + '%';
    
    // Update daily goal
    updateDailyGoalDisplay();
    
    // Update readiness
    updateReadiness();
    
    // Update city indicator
    updateCityIndicator();
}

function updateDailyGoalDisplay() {
    const progress = Math.min(100, Math.round((AppState.todayWords / AppState.dailyGoal) * 100));
    
    document.getElementById('goalProgress').textContent = `${AppState.todayWords} / ${AppState.dailyGoal}`;
    document.getElementById('goalPercent').textContent = progress + '%';
    document.getElementById('goalFill').style.width = progress + '%';
    
    let message = '';
    if (AppState.todayWords === 0) {
        message = 'Bugün henüz başlamadın!';
    } else if (progress < 50) {
        message = 'İyi bir başlangıç! Devam et.';
    } else if (progress < 100) {
        message = 'Yarıdan fazlasını tamamladın!';
    } else {
        message = '🎉 Günlük hedefini tamamladın!';
        
        // Trigger confetti when goal is first reached
        if (AppState.todayWords === AppState.dailyGoal) {
            triggerConfetti();
        }
    }
    
    document.getElementById('goalMessage').textContent = message;
}

function updateDailyGoal() {
    const input = document.getElementById('dailyGoalInput');
    AppState.dailyGoal = parseInt(input.value) || 30;
    saveUserProgress();
    updateDailyGoalDisplay();
}

function updateExamCountdown() {
    const now = new Date();
    const diff = EXAM_DATE - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    document.getElementById('daysLeft').textContent = days;
}

function updateReadiness() {
    const mastered = AppState.vocabulary.filter(w => w.mastery >= 3).length;
    const total = AppState.vocabulary.length;
    const readiness = Math.round((mastered / total) * 100);
    
    document.getElementById('readinessPercent').textContent = readiness + '%';
    document.getElementById('readinessFill').style.width = readiness + '%';
    
    // Calculate words per day needed
    const now = new Date();
    const daysLeft = Math.ceil((EXAM_DATE - now) / (1000 * 60 * 60 * 24));
    const remaining = total - mastered;
    const wordsPerDay = Math.ceil(remaining / daysLeft);
    
    document.getElementById('readinessTip').textContent = 
        `Hedefine ulaşmak için günde ${wordsPerDay} kelime öğrenmelisin.`;
}

function updateDistributionBar() {
    const counts = [0, 0, 0, 0, 0];
    AppState.vocabulary.forEach(w => counts[w.mastery]++);
    
    const total = AppState.vocabulary.length;
    const bar = document.getElementById('distributionBar');
    
    bar.innerHTML = counts.map((count, level) => {
        const percent = (count / total) * 100;
        const color = MASTERY_LEVELS[level].color;
        return `<div class="dist-segment" style="width: ${percent}%; background: ${color}"></div>`;
    }).join('');
    
    // Update legend
    document.getElementById('distNew').textContent = counts[0];
    document.getElementById('distSeen').textContent = counts[1];
    document.getElementById('distLearning').textContent = counts[2];
    document.getElementById('distFamiliar').textContent = counts[3];
    document.getElementById('distMastered').textContent = counts[4];
}

function updateHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    const now = new Date();
    const days = [];
    
    // Last 28 days
    for (let i = 27; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = AppState.studyHistory[dateStr] || 0;
        
        let level = '';
        if (count > 0) level = 'level-1';
        if (count >= 10) level = 'level-2';
        if (count >= 20) level = 'level-3';
        if (count >= 30) level = 'level-4';
        
        days.push(`<div class="heatmap-day ${level}" title="${dateStr}: ${count} kelime"></div>`);
    }
    
    grid.innerHTML = days.join('');
}

function updateCityIndicator() {
    const mastered = AppState.vocabulary.filter(w => w.mastery >= 3).length;
    const total = AppState.vocabulary.length;
    const progress = mastered / total;
    
    let city = '📍 Başlangıç';
    let next = 'Sonraki: Würzburg';
    
    if (progress >= 0.9) {
        city = '🏛️ Berlin - Hedefe ulaştın!';
        next = 'A-Level\'a hazırsın!';
    } else if (progress >= 0.75) {
        city = '🌲 Brandenburg';
        next = 'Sonraki: Berlin';
    } else if (progress >= 0.6) {
        city = '🎵 Leipzig Bölgesi';
        next = 'Sonraki: Brandenburg';
    } else if (progress >= 0.45) {
        city = '🏛️ Erfurt Bölgesi';
        next = 'Sonraki: Leipzig';
    } else if (progress >= 0.3) {
        city = '🌳 Hessen/Thüringen';
        next = 'Sonraki: Erfurt';
    } else if (progress >= 0.15) {
        city = '🏰 Würzburg Bölgesi';
        next = 'Sonraki: Erfurt';
    }
    
    document.getElementById('currentCityIndicator').textContent = city;
    document.getElementById('nextMilestone').textContent = next;
}

function updateEncouragement() {
    const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    document.getElementById('encouragementIcon').textContent = msg.icon;
    document.getElementById('encouragementText').textContent = msg.text;
}

function renderCharts() {
    // Activity Chart
    const activityCtx = document.getElementById('activityChart');
    if (activityCtx && !AppState.activityChart) {
        const labels = [];
        const data = [];
        const now = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
            data.push(AppState.studyHistory[dateStr] || 0);
        }
        
        AppState.activityChart = new Chart(activityCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Kelimeler',
                    data,
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    borderColor: 'rgb(99, 102, 241)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // Level Distribution Chart
    const levelCtx = document.getElementById('levelChart');
    if (levelCtx && !AppState.levelChart) {
        const counts = [0, 0, 0, 0, 0];
        AppState.vocabulary.forEach(w => counts[w.mastery]++);
        
        AppState.levelChart = new Chart(levelCtx, {
            type: 'doughnut',
            data: {
                labels: ['Yeni', 'Görüldü', 'Öğreniliyor', 'Tanıdık', 'Ustalaşılan'],
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#ef4444',
                        '#f97316',
                        '#eab308',
                        '#84cc16',
                        '#22c55e'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

// ============ ACHIEVEMENTS & GAMIFICATION ============

function checkStreak() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (AppState.lastStudyDate === today) {
        // Already studied today
        return;
    } else if (AppState.lastStudyDate === yesterday) {
        // Streak continues
        AppState.streak++;
    } else if (AppState.lastStudyDate !== null) {
        // Streak broken
        AppState.streak = 0;
    }
    
    saveUserProgress();
}

function calculateTodayWords() {
    const today = new Date().toISOString().split('T')[0];
    AppState.todayWords = AppState.studyHistory[today] || 0;
}

function checkAchievements() {
    const mastered = AppState.vocabulary.filter(w => w.mastery >= 4).length;
    
    // Check various achievements
    const achievements = [
        { condition: AppState.todayWords === AppState.dailyGoal, title: 'Günlük Hedef!', text: 'Bugünkü hedefini tamamladın!' },
        { condition: mastered === 100, title: '100 Kelime!', text: '100 kelimede ustalaştın!' },
        { condition: mastered === 500, title: '500 Kelime!', text: '500 kelimede ustalaştın!' },
        { condition: mastered === 1000, title: '1000 Kelime!', text: '1000 kelimede ustalaştın!' },
        { condition: AppState.streak === 7, title: 'Haftalık Seri!', text: '7 gün üst üste çalıştın!' },
        { condition: AppState.streak === 30, title: 'Aylık Seri!', text: '30 gün üst üste çalıştın!' }
    ];
    
    for (const achievement of achievements) {
        if (achievement.condition) {
            showAchievement(achievement.title, achievement.text);
            break;
        }
    }
}

function showAchievement(title, text) {
    document.getElementById('achievementTitle').textContent = title;
    document.getElementById('achievementText').textContent = text;
    
    const toast = document.getElementById('achievementToast');
    toast.classList.add('show');
    
    triggerConfetti();
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function triggerConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
    
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
    }, 200);
    
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });
    }, 400);
}

// Make functions globally available
window.flipCard = flipCard;
window.rateWord = rateWord;
window.skipWord = skipWord;
window.shuffleQueue = shuffleQueue;
window.selectQuizOption = selectQuizOption;
window.nextQuizQuestion = nextQuizQuestion;
window.newMatchGame = newMatchGame;
window.selectMatchItem = selectMatchItem;
window.filterWordList = filterWordList;
window.goToPage = goToPage;
window.updateDailyGoal = updateDailyGoal;
