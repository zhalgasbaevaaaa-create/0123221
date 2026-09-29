/* ==========================================================================
   MONGOL ERA & GOLDEN HORDE ARENA - FULL GAME ENGINE
   Academic 4-Team Engine for 52 Students, 7 Modes, Stopwatches & Grand Final
   ========================================================================== */

(function() {
    'use strict';

    // Application State
    const AppState = {
        teams: [
            { id: 1, name: "1-команда «Алтын Орда»", avatar: "👑", students: 13, score: 0, color: "#f59e0b", answeredCount: 0 },
            { id: 2, name: "2-команда «Ақ Орда»", avatar: "🦅", students: 13, score: 0, color: "#06b6d4", answeredCount: 0 },
            { id: 3, name: "3-команда «Шыңғысхан жасағы»", avatar: "🏹", students: 13, score: 0, color: "#10b981", answeredCount: 0 },
            { id: 4, name: "4-команда «Отырар қорғаушылары»", avatar: "🛡️", students: 13, score: 0, color: "#ef4444", answeredCount: 0 }
        ],
        activeTeamId: 1,
        currentView: 'menu',
        
        // Jeopardy State
        jeopardyAnswers: {}, // key -> { status: 'correct'|'wrong', teamId, points }
        activeJeopardyQ: null,
        
        // Mode Indices
        currentMatchingIndex: 0,
        currentDetectiveIndex: 0,
        currentExpeditionIndex: 0,
        currentExpeditionStepIndex: 0,
        currentTimeMachineIndex: 0,
        currentCourtIndex: 0,
        currentStrategyIndex: 0,
        
        // Matching State
        matchingSelection: {
            leftKey: null,
            rightKey: null
        },
        matchedPairsInCurrentStage: [],
        
        // Global Timer
        globalTimer: {
            seconds: 60,
            interval: null,
            isRunning: false,
            initialSeconds: 60
        },
        
        // Modal Dedicated Timer
        modalTimer: {
            seconds: 45,
            interval: null,
            isRunning: false,
            initialSeconds: 45
        }
    };

    // DOM Elements Cache
    const DOM = {
        views: {},
        teamsRibbon: null,
        answeringSelects: [],
        
        // Timers
        globalTimerDisplay: null,
        btnGlobalTimerStart: null,
        btnGlobalTimerPause: null,
        btnGlobalTimerReset: null,
        
        modalTimerDisplay: null,
        btnModalTimerStart: null,
        btnModalTimerPause: null,
        btnModalTimerReset: null,
        
        // Modals
        jeopardyModal: null,
        teacherModal: null,
        confettiCanvas: null
    };

    // Initialize on DOM Ready
    window.addEventListener('DOMContentLoaded', () => {
        initDOM();
        loadSavedState();
        initTeamsRibbon();
        initGlobalTimer();
        initModalTimer();
        initNavigation();
        initJeopardy();
        initMatchingGame();
        initDetective();
        initExpeditionMap();
        initTimeMachine();
        initCourt();
        initStrategy();
        initTeacherModal();
        initKeyboardShortcuts();
        
        document.body.addEventListener('click', () => {
            if (window.SoundManager) window.SoundManager.init();
        }, { once: true });
    });

    function initDOM() {
        DOM.views = {
            menu: document.getElementById('view-menu'),
            jeopardy: document.getElementById('view-jeopardy'),
            matching: document.getElementById('view-matching'),
            detective: document.getElementById('view-detective'),
            expedition: document.getElementById('view-expedition'),
            timeline: document.getElementById('view-timeline'),
            court: document.getElementById('view-court'),
            strategy: document.getElementById('view-strategy'),
            final: document.getElementById('view-final')
        };

        DOM.teamsRibbon = document.getElementById('teams-ribbon');
        DOM.answeringSelects = document.querySelectorAll('.answering-select');

        DOM.globalTimerDisplay = document.getElementById('global-timer-display');
        DOM.btnGlobalTimerStart = document.getElementById('btn-global-timer-start');
        DOM.btnGlobalTimerPause = document.getElementById('btn-global-timer-pause');
        DOM.btnGlobalTimerReset = document.getElementById('btn-global-timer-reset');

        DOM.modalTimerDisplay = document.getElementById('modal-timer-num');
        DOM.btnModalTimerStart = document.getElementById('btn-modal-timer-start');
        DOM.btnModalTimerPause = document.getElementById('btn-modal-timer-pause');
        DOM.btnModalTimerReset = document.getElementById('btn-modal-timer-reset');

        DOM.jeopardyModal = document.getElementById('jeopardy-modal');
        DOM.teacherModal = document.getElementById('teacher-modal');
        DOM.confettiCanvas = document.getElementById('confetti-canvas');
    }

    // State persistence
    function saveState() {
        try {
            localStorage.setItem('mongol_arena_state_v2', JSON.stringify({
                teams: AppState.teams,
                jeopardyAnswers: AppState.jeopardyAnswers
            }));
        } catch (e) {
            console.warn("Storage not available", e);
        }
    }

    function loadSavedState() {
        try {
            const saved = localStorage.getItem('mongol_arena_state_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.teams && parsed.teams.length === 4) {
                    AppState.teams = parsed.teams;
                }
                if (parsed.jeopardyAnswers) {
                    AppState.jeopardyAnswers = parsed.jeopardyAnswers;
                }
            }
        } catch (e) {
            console.warn("Could not load state", e);
        }
    }

    // 4 Teams Ribbon
    function initTeamsRibbon() {
        renderTeamsRibbon();
        updateAnsweringSelects();
    }

    function renderTeamsRibbon() {
        if (!DOM.teamsRibbon) return;
        DOM.teamsRibbon.innerHTML = '';

        AppState.teams.forEach(team => {
            const chip = document.createElement('div');
            chip.className = `team-chip ${team.id === AppState.activeTeamId ? 'active-team' : ''}`;
            chip.dataset.teamId = team.id;

            chip.innerHTML = `
                <div class="team-chip-top">
                    <span class="team-avatar">${team.avatar}</span>
                    <span class="team-name-text" title="${team.name}">${team.name}</span>
                    <span class="team-members-count">${team.students} оқушы</span>
                </div>
                <div class="team-chip-bottom">
                    <div class="team-score-num">${team.score} ұпай</div>
                    <div class="team-quick-add">
                        <button class="btn-mini-point" data-add="50" title="+50">+50</button>
                        <button class="btn-mini-point" data-add="100" title="+100">+100</button>
                    </div>
                </div>
            `;

            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-mini-point')) {
                    const add = parseInt(e.target.dataset.add, 10);
                    awardPoints(team.id, add, "Қолмен ұпай қосу");
                    return;
                }
                setActiveTeam(team.id);
            });

            DOM.teamsRibbon.appendChild(chip);
        });
    }

    function setActiveTeam(teamId) {
        AppState.activeTeamId = teamId;
        renderTeamsRibbon();
        updateAnsweringSelects();
        if (window.SoundManager) window.SoundManager.play('click');
    }

    function updateAnsweringSelects() {
        DOM.answeringSelects.forEach(select => {
            select.innerHTML = '';
            AppState.teams.forEach(team => {
                const opt = document.createElement('option');
                opt.value = team.id;
                opt.textContent = team.name;
                if (team.id === AppState.activeTeamId) opt.selected = true;
                select.appendChild(opt);
            });
            select.onchange = (e) => {
                setActiveTeam(parseInt(e.target.value, 10));
            };
        });
    }

    function awardPoints(teamId, points, reason) {
        const team = AppState.teams.find(t => t.id === teamId);
        if (team) {
            team.score += points;
            team.answeredCount = (team.answeredCount || 0) + 1;
            renderTeamsRibbon();
            saveState();
            if (window.SoundManager) window.SoundManager.play(points >= 0 ? 'correct' : 'wrong');
        }
    }

    // Navigation
    function initNavigation() {
        document.querySelectorAll('[data-view-target]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.viewTarget;
                showView(target);
            });
        });

        const btnFinal = document.getElementById('btn-open-grand-final');
        if (btnFinal) {
            btnFinal.addEventListener('click', () => showView('final'));
        }
    }

    function showView(viewId) {
        if (!DOM.views[viewId]) return;

        Object.keys(DOM.views).forEach(k => {
            if (DOM.views[k]) DOM.views[k].classList.remove('active-view');
        });

        DOM.views[viewId].classList.add('active-view');
        AppState.currentView = viewId;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.SoundManager) window.SoundManager.play('transition');

        if (viewId === 'final') {
            renderGrandFinal();
        }
    }

    // Global Stopwatch
    function initGlobalTimer() {
        if (!DOM.globalTimerDisplay) return;

        DOM.btnGlobalTimerStart.addEventListener('click', () => startGlobalTimer());
        DOM.btnGlobalTimerPause.addEventListener('click', () => pauseGlobalTimer());
        DOM.btnGlobalTimerReset.addEventListener('click', () => resetGlobalTimer(60));

        updateTimerDisplay(DOM.globalTimerDisplay, AppState.globalTimer.seconds);
    }

    function startGlobalTimer() {
        if (AppState.globalTimer.isRunning) return;
        AppState.globalTimer.isRunning = true;
        if (window.SoundManager) window.SoundManager.play('click');

        AppState.globalTimer.interval = setInterval(() => {
            if (AppState.globalTimer.seconds > 0) {
                AppState.globalTimer.seconds--;
                updateTimerDisplay(DOM.globalTimerDisplay, AppState.globalTimer.seconds);

                if (AppState.globalTimer.seconds <= 5 && AppState.globalTimer.seconds > 0) {
                    if (window.SoundManager) window.SoundManager.play('urgent');
                    DOM.globalTimerDisplay.parentElement.classList.add('urgent');
                }
            } else {
                pauseGlobalTimer();
                if (window.SoundManager) window.SoundManager.play('buzzer');
                DOM.globalTimerDisplay.parentElement.classList.remove('urgent');
            }
        }, 1000);
    }

    function pauseGlobalTimer() {
        AppState.globalTimer.isRunning = false;
        clearInterval(AppState.globalTimer.interval);
    }

    function resetGlobalTimer(sec) {
        pauseGlobalTimer();
        AppState.globalTimer.seconds = sec || 60;
        if (DOM.globalTimerDisplay) {
            DOM.globalTimerDisplay.parentElement.classList.remove('urgent');
            updateTimerDisplay(DOM.globalTimerDisplay, AppState.globalTimer.seconds);
        }
    }

    // Question Modal Dedicated Stopwatch
    function initModalTimer() {
        if (!DOM.modalTimerDisplay) return;

        DOM.btnModalTimerStart.addEventListener('click', () => startModalTimer());
        DOM.btnModalTimerPause.addEventListener('click', () => pauseModalTimer());
        DOM.btnModalTimerReset.addEventListener('click', () => resetModalTimer(45));
    }

    function startModalTimer() {
        if (AppState.modalTimer.isRunning) return;
        AppState.modalTimer.isRunning = true;
        if (window.SoundManager) window.SoundManager.play('click');

        AppState.modalTimer.interval = setInterval(() => {
            if (AppState.modalTimer.seconds > 0) {
                AppState.modalTimer.seconds--;
                updateTimerDisplay(DOM.modalTimerDisplay, AppState.modalTimer.seconds);

                if (AppState.modalTimer.seconds <= 5 && AppState.modalTimer.seconds > 0) {
                    if (window.SoundManager) window.SoundManager.play('urgent');
                    DOM.modalTimerDisplay.parentElement.classList.add('urgent');
                }
            } else {
                pauseModalTimer();
                if (window.SoundManager) window.SoundManager.play('buzzer');
                DOM.modalTimerDisplay.parentElement.classList.remove('urgent');
            }
        }, 1000);
    }

    function pauseModalTimer() {
        AppState.modalTimer.isRunning = false;
        clearInterval(AppState.modalTimer.interval);
    }

    function resetModalTimer(sec) {
        pauseModalTimer();
        AppState.modalTimer.seconds = sec || 45;
        if (DOM.modalTimerDisplay) {
            DOM.modalTimerDisplay.parentElement.classList.remove('urgent');
            updateTimerDisplay(DOM.modalTimerDisplay, AppState.modalTimer.seconds);
        }
    }

    function updateTimerDisplay(element, totalSeconds) {
        if (!element) return;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        element.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // ==========================================================================
    // 1. JEOPARDY BOARD & MODAL
    // ==========================================================================
    function initJeopardy() {
        const board = document.getElementById('jeopardy-board');
        if (!board || !window.GAME_DATA || !window.GAME_DATA.jeopardy) return;

        board.innerHTML = '';
        const cats = window.GAME_DATA.jeopardy.categories;
        const allQuestions = window.GAME_DATA.jeopardy.questions;

        cats.forEach(cat => {
            const col = document.createElement('div');
            col.className = 'jeopardy-col';

            const header = document.createElement('div');
            header.className = 'jeopardy-header-cell';
            header.innerHTML = `<span>${cat.title}</span>`;
            col.appendChild(header);

            // Filter questions for this category
            const catQuestions = allQuestions.filter(q => q.catId === cat.id);

            catQuestions.forEach(q => {
                const ptsDisplay = q.points * 10; // 10 -> 100, 20 -> 200, ...
                const btn = document.createElement('button');
                btn.className = 'jeopardy-btn';
                btn.dataset.id = q.id;
                btn.dataset.points = ptsDisplay;

                const existing = AppState.jeopardyAnswers[q.id];
                if (existing) {
                    if (existing.status === 'correct') {
                        btn.classList.add('answered-correct');
                        btn.innerHTML = `<span>✓</span><span class="cell-status-sub">ДҰРЫС</span>`;
                    } else {
                        btn.classList.add('answered-wrong');
                        btn.innerHTML = `<span>↺</span><span class="cell-status-sub">${ptsDisplay}</span>`;
                    }
                } else {
                    btn.innerHTML = `<span>${ptsDisplay}</span>`;
                }

                btn.addEventListener('click', () => {
                    openJeopardyModal(cat, q, ptsDisplay);
                });

                col.appendChild(btn);
            });

            board.appendChild(col);
        });

        // Close Modal
        const btnClose = document.getElementById('btn-close-j-modal');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                DOM.jeopardyModal.classList.remove('active');
                pauseModalTimer();
            });
        }
    }

    function openJeopardyModal(cat, q, ptsDisplay) {
        AppState.activeJeopardyQ = q;

        document.getElementById('j-modal-cat').textContent = cat.title;
        document.getElementById('j-modal-points').textContent = `${ptsDisplay} ҰПАЙ`;
        document.getElementById('j-modal-question').textContent = q.question;

        resetModalTimer(45);
        startModalTimer();

        const optionsGrid = document.getElementById('j-modal-options');
        optionsGrid.innerHTML = '';

        const feedback = document.getElementById('j-modal-feedback');
        feedback.classList.remove('active');
        feedback.innerHTML = '';

        const prefixes = ['A', 'B', 'C', 'D'];

        q.options.forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn-option-card';
            btn.innerHTML = `<span class="opt-prefix">${prefixes[idx]}</span><span>${optText}</span>`;

            btn.addEventListener('click', () => {
                handleJeopardyAnswer(idx, q, ptsDisplay, btn, optionsGrid, feedback);
            });

            optionsGrid.appendChild(btn);
        });

        // Teacher override manual award button
        const btnManualAward = document.getElementById('btn-manual-award-j');
        if (btnManualAward) {
            btnManualAward.onclick = () => {
                awardPoints(AppState.activeTeamId, ptsDisplay, "Мұғалім шешімімен ұпай берілді");
                markJeopardyCell(q.id, 'correct', ptsDisplay);
                DOM.jeopardyModal.classList.remove('active');
                pauseModalTimer();
            };
        }

        DOM.jeopardyModal.classList.add('active');
        if (window.SoundManager) window.SoundManager.play('transition');
    }

    function handleJeopardyAnswer(selectedIndex, q, ptsDisplay, selectedBtn, optionsGrid, feedback) {
        pauseModalTimer();

        if (selectedIndex === q.correct) {
            // Correct!
            selectedBtn.classList.add('correct');
            if (window.SoundManager) window.SoundManager.play('correct');

            Array.from(optionsGrid.children).forEach(b => b.classList.add('disabled'));

            feedback.innerHTML = `
                <div class="feedback-title correct">✓ ДҰРЫС ЖАУАП! +${ptsDisplay} ұпай</div>
                <div class="feedback-explanation"><strong>Тарихи түсіндірме:</strong> ${q.explanation}</div>
            `;
            feedback.classList.add('active');

            awardPoints(AppState.activeTeamId, ptsDisplay, `Jeopardy: ${q.id}`);
            markJeopardyCell(q.id, 'correct', ptsDisplay);
        } else {
            // Wrong!
            selectedBtn.classList.add('wrong');
            selectedBtn.disabled = true;
            if (window.SoundManager) window.SoundManager.play('wrong');

            feedback.innerHTML = `
                <div class="feedback-title wrong">✗ ҚАТЕ ЖАУАП! Басқа команда жауап бере алады.</div>
            `;
            feedback.classList.add('active');

            markJeopardyCell(q.id, 'wrong', ptsDisplay);
        }
    }

    function markJeopardyCell(qId, status, ptsDisplay) {
        AppState.jeopardyAnswers[qId] = { status, teamId: AppState.activeTeamId, points: ptsDisplay };
        saveState();

        const cell = document.querySelector(`.jeopardy-btn[data-id="${qId}"]`);
        if (cell) {
            if (status === 'correct') {
                cell.classList.remove('answered-wrong');
                cell.classList.add('answered-correct');
                cell.innerHTML = `<span>✓</span><span class="cell-status-sub">ДҰРЫС</span>`;
            } else {
                cell.classList.add('answered-wrong');
                cell.innerHTML = `<span>↺</span><span class="cell-status-sub">${ptsDisplay}</span>`;
            }
        }
    }

    // ==========================================================================
    // 2. MATCHING & FIND PAIRS («Сәйкестендіру және жұбын тап»)
    // ==========================================================================
    function initMatchingGame() {
        if (!window.GAME_DATA || !window.GAME_DATA.matching) return;

        const btnNext = document.getElementById('btn-next-matching-stage');
        const btnPrev = document.getElementById('btn-prev-matching-stage');

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (AppState.currentMatchingIndex < window.GAME_DATA.matching.length - 1) {
                    renderMatchingStage(AppState.currentMatchingIndex + 1);
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (AppState.currentMatchingIndex > 0) {
                    renderMatchingStage(AppState.currentMatchingIndex - 1);
                }
            });
        }

        renderMatchingStage(0);
    }

    function renderMatchingStage(index) {
        const stage = window.GAME_DATA.matching[index];
        if (!stage) return;

        AppState.currentMatchingIndex = index;
        AppState.matchingSelection = { leftKey: null, rightKey: null };
        AppState.matchedPairsInCurrentStage = [];

        document.getElementById('matching-stage-title').textContent = stage.title;
        document.getElementById('matching-stage-desc').textContent = stage.instruction;
        document.getElementById('matching-stage-counter').textContent = `Кезең: ${index + 1} / ${window.GAME_DATA.matching.length}`;

        const leftCol = document.getElementById('matching-left-col');
        const rightCol = document.getElementById('matching-right-col');
        const feedback = document.getElementById('matching-feedback');

        leftCol.innerHTML = '';
        rightCol.innerHTML = '';
        feedback.classList.remove('active');

        // Create pairs with unique keys
        const indexedPairs = stage.pairs.map((p, idx) => ({ ...p, key: `pair-${idx}` }));
        const shuffledRight = [...indexedPairs].sort(() => Math.random() - 0.5);

        indexedPairs.forEach(p => {
            const btnLeft = document.createElement('button');
            btnLeft.className = 'match-item-btn';
            btnLeft.dataset.key = p.key;
            btnLeft.innerHTML = `<span>${p.left}</span><span class="match-indicator">●</span>`;

            btnLeft.addEventListener('click', () => {
                if (btnLeft.classList.contains('matched')) return;
                handleMatchSelect('left', p.key, btnLeft);
            });

            leftCol.appendChild(btnLeft);
        });

        shuffledRight.forEach(p => {
            const btnRight = document.createElement('button');
            btnRight.className = 'match-item-btn';
            btnRight.dataset.key = p.key;
            btnRight.innerHTML = `<span class="match-indicator">●</span><span>${p.right}</span>`;

            btnRight.addEventListener('click', () => {
                if (btnRight.classList.contains('matched')) return;
                handleMatchSelect('right', p.key, btnRight);
            });

            rightCol.appendChild(btnRight);
        });
    }

    function handleMatchSelect(side, key, btn) {
        if (window.SoundManager) window.SoundManager.play('click');

        if (side === 'left') {
            document.querySelectorAll('#matching-left-col .match-item-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            AppState.matchingSelection.leftKey = key;
        } else {
            document.querySelectorAll('#matching-right-col .match-item-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            AppState.matchingSelection.rightKey = key;
        }

        if (AppState.matchingSelection.leftKey && AppState.matchingSelection.rightKey) {
            checkMatchingPair();
        }
    }

    function checkMatchingPair() {
        const { leftKey, rightKey } = AppState.matchingSelection;
        const leftBtn = document.querySelector(`#matching-left-col .match-item-btn[data-key="${leftKey}"]`);
        const rightBtn = document.querySelector(`#matching-right-col .match-item-btn[data-key="${rightKey}"]`);

        if (leftKey === rightKey) {
            // Correct Pair!
            if (window.SoundManager) window.SoundManager.play('match');
            leftBtn.classList.remove('selected');
            rightBtn.classList.remove('selected');
            leftBtn.classList.add('matched');
            rightBtn.classList.add('matched');
            leftBtn.querySelector('.match-indicator').textContent = '✓';
            rightBtn.querySelector('.match-indicator').textContent = '✓';

            AppState.matchedPairsInCurrentStage.push(leftKey);
            AppState.matchingSelection = { leftKey: null, rightKey: null };

            const stage = window.GAME_DATA.matching[AppState.currentMatchingIndex];
            if (AppState.matchedPairsInCurrentStage.length === stage.pairs.length) {
                // Stage Complete!
                if (window.SoundManager) window.SoundManager.play('fanfare');
                awardPoints(AppState.activeTeamId, 200, `Matching: ${stage.title}`);

                const feedback = document.getElementById('matching-feedback');
                feedback.innerHTML = `
                    <div class="feedback-title correct">🎉 КЕРЕМЕТ! Барлық жұптар қатесіз сәйкестендірілді! +200 ұпай</div>
                    <div class="feedback-explanation"><strong>Тарихи түсіндірме:</strong> ${stage.explanation}</div>
                `;
                feedback.classList.add('active');
            }
        } else {
            // Wrong Pair!
            if (window.SoundManager) window.SoundManager.play('wrong');
            leftBtn.classList.add('wrong-shake');
            rightBtn.classList.add('wrong-shake');

            setTimeout(() => {
                leftBtn.classList.remove('wrong-shake', 'selected');
                rightBtn.classList.remove('wrong-shake', 'selected');
                AppState.matchingSelection = { leftKey: null, rightKey: null };
            }, 500);
        }
    }

    // ==========================================================================
    // 3. HISTORICAL DETECTIVE
    // ==========================================================================
    function initDetective() {
        if (!window.GAME_DATA || !window.GAME_DATA.detective) return;

        const list = document.getElementById('detective-case-list');
        list.innerHTML = '';

        window.GAME_DATA.detective.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.className = `btn-case-item ${idx === 0 ? 'active' : ''}`;
            btn.textContent = `Іс №${idx + 1}: ${c.title.split(':')[1] || c.title}`;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-case-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderDetectiveCase(idx);
            });

            list.appendChild(btn);
        });

        renderDetectiveCase(0);
    }

    function renderDetectiveCase(index) {
        const c = window.GAME_DATA.detective[index];
        if (!c) return;

        AppState.currentDetectiveIndex = index;
        document.getElementById('detective-case-title').textContent = c.title;
        document.getElementById('detective-mystery-text').textContent = c.question || c.title;

        const cluesList = document.getElementById('detective-clues-list');
        cluesList.innerHTML = '';
        c.clues.forEach(clue => {
            const li = document.createElement('li');
            li.className = 'clue-item';
            li.textContent = clue;
            cluesList.appendChild(li);
        });

        const optionsGrid = document.getElementById('detective-options-grid');
        optionsGrid.innerHTML = '';

        const feedback = document.getElementById('detective-feedback');
        feedback.classList.remove('active');

        const prefixes = ['A', 'B', 'C', 'D'];
        c.options.forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn-option-card';
            btn.innerHTML = `<span class="opt-prefix">${prefixes[idx]}</span><span>${optText}</span>`;

            btn.addEventListener('click', () => {
                if (idx === c.correct) {
                    btn.classList.add('correct');
                    if (window.SoundManager) window.SoundManager.play('correct');
                    feedback.innerHTML = `
                        <div class="feedback-title correct">✓ ТАРИХИ ІС АНЫҚТАЛДЫ! +250 ұпай</div>
                        <div class="feedback-explanation"><strong>Ғылыми сараптама:</strong> ${c.academicNote}</div>
                    `;
                    feedback.classList.add('active');
                    awardPoints(AppState.activeTeamId, 250, `Detective: ${c.title}`);
                } else {
                    btn.classList.add('wrong');
                    btn.disabled = true;
                    if (window.SoundManager) window.SoundManager.play('wrong');
                    feedback.innerHTML = `<div class="feedback-title wrong">✗ Болжам қате! Басқа айғақтарды салыстырыңыз.</div>`;
                    feedback.classList.add('active');
                }
            });

            optionsGrid.appendChild(btn);
        });
    }

    // ==========================================================================
    // 4. ARCHAEOLOGY & MAP EXPEDITION
    // ==========================================================================
    function initExpeditionMap() {
        if (!window.GAME_DATA || !window.GAME_DATA.expedition) return;

        renderExpeditionSite(0);

        document.querySelectorAll('.map-pin').forEach(pin => {
            pin.addEventListener('click', () => {
                const siteId = parseInt(pin.dataset.siteId, 10);
                renderExpeditionSite(siteId - 1);
            });
        });
    }

    function renderExpeditionSite(index) {
        const site = window.GAME_DATA.expedition[index];
        if (!site) return;

        AppState.currentExpeditionIndex = index;

        document.querySelectorAll('.map-pin').forEach(p => {
            p.classList.toggle('active-site', parseInt(p.dataset.siteId, 10) === (index + 1));
        });

        document.getElementById('site-name').textContent = site.siteName;
        document.getElementById('site-region').textContent = `Аймақ: ${site.region}`;
        document.getElementById('site-desc').textContent = site.significance;
        document.getElementById('site-artifact').textContent = `Дәуір: ${site.epoch}`;

        // First step question
        const stepQ = site.stepQuestions[0];
        document.getElementById('site-question').textContent = stepQ.q;

        const optionsGrid = document.getElementById('site-options-grid');
        optionsGrid.innerHTML = '';
        const feedback = document.getElementById('site-feedback');
        feedback.classList.remove('active');

        const prefixes = ['A', 'B', 'C', 'D'];
        stepQ.options.forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn-option-card';
            btn.innerHTML = `<span class="opt-prefix">${prefixes[idx]}</span><span>${optText}</span>`;

            btn.addEventListener('click', () => {
                if (idx === stepQ.correct) {
                    btn.classList.add('correct');
                    if (window.SoundManager) window.SoundManager.play('correct');
                    feedback.innerHTML = `
                        <div class="feedback-title correct">✓ ДҰРЫС ТАПТЫҢЫЗ! +200 ұпай</div>
                        <div class="feedback-explanation"><strong>Тарихи маңызы:</strong> ${site.significance}</div>
                    `;
                    feedback.classList.add('active');
                    awardPoints(AppState.activeTeamId, 200, `Expedition: ${site.siteName}`);
                } else {
                    btn.classList.add('wrong');
                    btn.disabled = true;
                    if (window.SoundManager) window.SoundManager.play('wrong');
                    feedback.innerHTML = `<div class="feedback-title wrong">✗ Қате жауап! Қайта ойланыңыз.</div>`;
                    feedback.classList.add('active');
                }
            });

            optionsGrid.appendChild(btn);
        });
    }

    // ==========================================================================
    // 5. TIME MACHINE / CHRONOLOGY
    // ==========================================================================
    function initTimeMachine() {
        if (!window.GAME_DATA || !window.GAME_DATA.timeMachine) return;

        const btnNext = document.getElementById('btn-next-timeline-task');
        const btnPrev = document.getElementById('btn-prev-timeline-task');

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (AppState.currentTimeMachineIndex < window.GAME_DATA.timeMachine.length - 1) {
                    renderTimeMachineTask(AppState.currentTimeMachineIndex + 1);
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (AppState.currentTimeMachineIndex > 0) {
                    renderTimeMachineTask(AppState.currentTimeMachineIndex - 1);
                }
            });
        }

        renderTimeMachineTask(0);
    }

    function renderTimeMachineTask(index) {
        const task = window.GAME_DATA.timeMachine[index];
        if (!task) return;

        AppState.currentTimeMachineIndex = index;
        document.getElementById('timeline-task-title').textContent = task.title;
        document.getElementById('timeline-task-desc').textContent = task.description;
        document.getElementById('timeline-task-counter').textContent = `Тапсырма: ${index + 1} / ${window.GAME_DATA.timeMachine.length}`;

        const list = document.getElementById('timeline-sortable-list');
        const feedback = document.getElementById('timeline-feedback');
        feedback.classList.remove('active');

        // Shuffled copy
        const currentItems = [...task.items].sort(() => Math.random() - 0.5);

        function renderItems() {
            list.innerHTML = '';
            currentItems.forEach((item, idx) => {
                const card = document.createElement('div');
                card.className = 'timeline-item-card';
                card.innerHTML = `
                    <div class="item-left-content">
                        <span class="item-rank-num">${idx + 1}</span>
                        <span>${item.text}</span>
                    </div>
                    <div class="item-ctrls">
                        ${idx > 0 ? `<button class="btn-move-order btn-move-up" data-idx="${idx}">▲ Жоғары</button>` : ''}
                        ${idx < currentItems.length - 1 ? `<button class="btn-move-order btn-move-down" data-idx="${idx}">▼ Төмен</button>` : ''}
                    </div>
                `;

                card.querySelectorAll('.btn-move-up').forEach(b => {
                    b.onclick = () => {
                        const i = parseInt(b.dataset.idx, 10);
                        const temp = currentItems[i];
                        currentItems[i] = currentItems[i - 1];
                        currentItems[i - 1] = temp;
                        renderItems();
                    };
                });

                card.querySelectorAll('.btn-move-down').forEach(b => {
                    b.onclick = () => {
                        const i = parseInt(b.dataset.idx, 10);
                        const temp = currentItems[i];
                        currentItems[i] = currentItems[i + 1];
                        currentItems[i + 1] = temp;
                        renderItems();
                    };
                });

                list.appendChild(card);
            });
        }

        renderItems();

        const btnCheck = document.getElementById('btn-check-timeline');
        btnCheck.onclick = () => {
            const isCorrect = currentItems.every((item, idx) => item.order === (idx + 1));
            if (isCorrect) {
                if (window.SoundManager) window.SoundManager.play('fanfare');
                feedback.innerHTML = `
                    <div class="feedback-title correct">✓ ХРОНОЛОГИЯЛЫҚ ТІЗБЕК ТОЛЫҚ ДҰРЫС! +200 ұпай</div>
                    <div class="feedback-explanation"><strong>Тарихи негіздеме:</strong> ${task.explanation}</div>
                `;
                feedback.classList.add('active');
                awardPoints(AppState.activeTeamId, 200, `Timeline: ${task.title}`);
            } else {
                if (window.SoundManager) window.SoundManager.play('wrong');
                feedback.innerHTML = `
                    <div class="feedback-title wrong">✗ Оқиғалардың ретінде қате бар! Қайта тексеріңіз.</div>
                    <div class="feedback-explanation"><strong>Дұрыс рет:</strong> ${task.explanation}</div>
                `;
                feedback.classList.add('active');
            }
        };
    }

    // ==========================================================================
    // 6. COURT OF ERAS
    // ==========================================================================
    function initCourt() {
        if (!window.GAME_DATA || !window.GAME_DATA.court) return;

        const btnNext = document.getElementById('btn-next-court-case');
        const btnPrev = document.getElementById('btn-prev-court-case');

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (AppState.currentCourtIndex < window.GAME_DATA.court.length - 1) {
                    renderCourtCase(AppState.currentCourtIndex + 1);
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (AppState.currentCourtIndex > 0) {
                    renderCourtCase(AppState.currentCourtIndex - 1);
                }
            });
        }

        renderCourtCase(0);
    }

    function renderCourtCase(index) {
        const c = window.GAME_DATA.court[index];
        if (!c) return;

        AppState.currentCourtIndex = index;
        document.getElementById('court-case-title').textContent = c.title;
        document.getElementById('court-case-desc').textContent = c.dilemma;
        document.getElementById('court-case-counter').textContent = `Іс: ${index + 1} / ${window.GAME_DATA.court.length}`;

        document.getElementById('court-prosecutor-arg').textContent = c.positions[0]?.argument || "";
        document.getElementById('court-defense-arg').textContent = c.positions[1]?.argument || "";

        const rubricsGrid = document.getElementById('court-rubrics-grid');
        rubricsGrid.innerHTML = '';

        const rubrics = [
            { points: 100, label: "Тұжырымды факт (+100)" },
            { points: 200, label: "Терең тарихи талдау (+200)" },
            { points: 300, label: "Академиялық жеңіс (+300)" }
        ];

        rubrics.forEach(rub => {
            const btn = document.createElement('button');
            btn.className = 'btn-rubric-point';
            btn.innerHTML = `<span>+${rub.points}</span> <span>${rub.label}</span>`;
            btn.onclick = () => {
                awardPoints(AppState.activeTeamId, rub.points, `Court: ${rub.label}`);
            };
            rubricsGrid.appendChild(btn);
        });

        document.getElementById('court-historical-verdict').textContent = c.historicalFacts;
    }

    // ==========================================================================
    // 7. HISTORICAL STRATEGY
    // ==========================================================================
    function initStrategy() {
        if (!window.GAME_DATA || !window.GAME_DATA.strategy) return;

        const btnNext = document.getElementById('btn-next-strategy-task');
        const btnPrev = document.getElementById('btn-prev-strategy-task');

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (AppState.currentStrategyIndex < window.GAME_DATA.strategy.length - 1) {
                    renderStrategyTask(AppState.currentStrategyIndex + 1);
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (AppState.currentStrategyIndex > 0) {
                    renderStrategyTask(AppState.currentStrategyIndex - 1);
                }
            });
        }

        renderStrategyTask(0);
    }

    function renderStrategyTask(index) {
        const s = window.GAME_DATA.strategy[index];
        if (!s) return;

        AppState.currentStrategyIndex = index;
        document.getElementById('strategy-title').textContent = s.title;
        document.getElementById('strategy-desc').textContent = s.context;
        document.getElementById('strategy-task-counter').textContent = `Сценарий: ${index + 1} / ${window.GAME_DATA.strategy.length}`;

        const choicesGrid = document.getElementById('strategy-choices-grid');
        choicesGrid.innerHTML = '';
        const outcomeCard = document.getElementById('strategy-outcome-card');
        outcomeCard.classList.remove('active');

        s.choices.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'btn-strategy-choice';
            btn.innerHTML = `<span class="opt-prefix">${ch.id}</span> <span>${ch.text}</span>`;

            btn.onclick = () => {
                document.querySelectorAll('.btn-strategy-choice').forEach(b => b.classList.add('disabled'));
                const isBest = ch.id === s.bestChoice;
                btn.classList.add(isBest ? 'selected-best' : 'selected-alt');
                if (window.SoundManager) window.SoundManager.play(isBest ? 'fanfare' : 'correct');

                const pts = isBest ? 300 : 100;
                document.getElementById('strategy-outcome-result').textContent = `Нәтиже (+${pts} ұпай): ${ch.consequence}`;
                document.getElementById('strategy-outcome-analysis').textContent = `Тарихи сабақ: ${s.academicLesson}`;
                outcomeCard.classList.add('active');

                awardPoints(AppState.activeTeamId, pts, `Strategy: ${s.title}`);
            };

            choicesGrid.appendChild(btn);
        });
    }

    // ==========================================================================
    // GRAND FINAL & PODIUM (4 TEAMS)
    // ==========================================================================
    function renderGrandFinal() {
        if (window.SoundManager) window.SoundManager.play('fanfare');
        startConfetti();

        const sorted = [...AppState.teams].sort((a, b) => b.score - a.score);

        const p1 = document.getElementById('podium-1');
        const p2 = document.getElementById('podium-2');
        const p3 = document.getElementById('podium-3');
        const p4 = document.getElementById('podium-4');

        if (p1 && sorted[0]) {
            p1.querySelector('.podium-team-name').textContent = sorted[0].name;
            p1.querySelector('.podium-team-score').textContent = `${sorted[0].score} ұпай`;
        }
        if (p2 && sorted[1]) {
            p2.querySelector('.podium-team-name').textContent = sorted[1].name;
            p2.querySelector('.podium-team-score').textContent = `${sorted[1].score} ұпай`;
        }
        if (p3 && sorted[2]) {
            p3.querySelector('.podium-team-name').textContent = sorted[2].name;
            p3.querySelector('.podium-team-score').textContent = `${sorted[2].score} ұпай`;
        }
        if (p4 && sorted[3]) {
            p4.querySelector('.podium-team-name').textContent = sorted[3].name;
            p4.querySelector('.podium-team-score').textContent = `${sorted[3].score} ұпай`;
        }

        const tbody = document.getElementById('final-stats-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            const ranks = ['🥇 1-орын', '🥈 2-орын', '🥉 3-орын', '4-орын'];
            sorted.forEach((team, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${ranks[idx]}</strong></td>
                    <td>${team.name}</td>
                    <td>${team.students} оқушы</td>
                    <td><strong>${team.score}</strong></td>
                    <td>${team.answeredCount || 0}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        renderFinalChart(sorted);

        const btnPrint = document.getElementById('btn-print-results');
        if (btnPrint) {
            btnPrint.onclick = () => window.print();
        }
    }

    function renderFinalChart(sortedTeams) {
        const container = document.getElementById('final-chart-container');
        if (!container) return;

        const maxScore = Math.max(...sortedTeams.map(t => t.score), 100);
        const svgW = 800;
        const svgH = 220;
        const barH = 34;
        const gap = 16;

        let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" class="svg-chart-wrapper" xmlns="http://www.w3.org/2000/svg">`;

        sortedTeams.forEach((t, i) => {
            const y = i * (barH + gap) + 15;
            const barW = Math.max(20, (t.score / maxScore) * 500);
            svg += `
                <text x="10" y="${y + 22}" fill="#f8fafc" font-size="14" font-weight="700">${t.name.split('«')[1]?.replace('»', '') || t.name}</text>
                <rect x="220" y="${y}" width="${barW}" height="${barH}" rx="6" fill="${t.color}" opacity="0.85" />
                <text x="${230 + barW}" y="${y + 22}" fill="#fbbf24" font-size="15" font-weight="800">${t.score} ұпай</text>
            `;
        });

        svg += `</svg>`;
        container.innerHTML = svg;
    }

    // Confetti
    function startConfetti() {
        const canvas = DOM.confettiCanvas;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const pieces = [];
        const colors = ['#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#fbbf24', '#ffffff'];

        for (let i = 0; i < 150; i++) {
            pieces.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 9 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedY: Math.random() * 3 + 2,
                speedX: Math.random() * 2 - 1,
                rotation: Math.random() * 360,
                rotSpeed: Math.random() * 5 - 2.5
            });
        }

        let frames = 0;
        function loop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                p.y += p.speedY;
                p.x += p.speedX;
                p.rotation += p.rotSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });

            frames++;
            if (frames < 300) {
                if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(loop);
                } else {
                    setTimeout(loop, 16);
                }
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        loop();
    }

    // Teacher Modal
    function initTeacherModal() {
        const btnOpen = document.getElementById('btn-open-teacher-panel');
        const btnClose = document.getElementById('btn-close-teacher-modal');
        const btnSave = document.getElementById('btn-save-teacher-changes');
        const btnReset = document.getElementById('btn-reset-entire-game');

        if (btnOpen) {
            btnOpen.addEventListener('click', () => {
                const pin = prompt("Мұғалім режимінің құпия сөзі (2026):", "2026");
                if (pin === "2026") {
                    renderTeacherSettings();
                    DOM.teacherModal.classList.add('active');
                } else if (pin !== null) {
                    alert("Құпия сөз қате!");
                }
            });
        }

        if (btnClose) {
            btnClose.addEventListener('click', () => DOM.teacherModal.classList.remove('active'));
        }

        if (btnSave) {
            btnSave.addEventListener('click', () => {
                AppState.teams.forEach(t => {
                    const nameInp = document.getElementById(`teacher-team-name-${t.id}`);
                    const scoreInp = document.getElementById(`teacher-team-score-${t.id}`);
                    const studInp = document.getElementById(`teacher-team-stud-${t.id}`);

                    if (nameInp) t.name = nameInp.value;
                    if (scoreInp) t.score = parseInt(scoreInp.value, 10) || 0;
                    if (studInp) t.students = parseInt(studInp.value, 10) || 13;
                });

                saveState();
                renderTeamsRibbon();
                updateAnsweringSelects();
                DOM.teacherModal.classList.remove('active');
                if (window.SoundManager) window.SoundManager.play('correct');
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm("Барлық ұпайлар мен деректер нөлден басталады. Сенімдісіз бе?")) {
                    AppState.teams.forEach(t => { t.score = 0; t.answeredCount = 0; });
                    AppState.jeopardyAnswers = {};
                    saveState();
                    location.reload();
                }
            });
        }
    }

    function renderTeacherSettings() {
        const list = document.getElementById('teacher-teams-edit-list');
        if (!list) return;

        list.innerHTML = '';
        AppState.teams.forEach(t => {
            const row = document.createElement('div');
            row.className = 'team-edit-row';
            row.innerHTML = `
                <span>${t.avatar}</span>
                <input type="text" id="teacher-team-name-${t.id}" class="input-dark" value="${t.name}">
                <input type="number" id="teacher-team-score-${t.id}" class="input-dark" value="${t.score}" placeholder="Ұпай">
                <input type="number" id="teacher-team-stud-${t.id}" class="input-dark" value="${t.students}" placeholder="Оқушы саны">
            `;
            list.appendChild(row);
        });
    }

    function initKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (DOM.jeopardyModal) DOM.jeopardyModal.classList.remove('active');
                if (DOM.teacherModal) DOM.teacherModal.classList.remove('active');
                pauseModalTimer();
            }
            if (e.code === 'Space' && (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
                e.preventDefault();
                if (AppState.globalTimer.isRunning) {
                    pauseGlobalTimer();
                } else {
                    startGlobalTimer();
                }
            }
        });
    }

})();
