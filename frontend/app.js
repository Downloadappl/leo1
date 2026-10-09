/**
 * الأستاذ ليو — المستشار والموجه الأكاديمي
 * Iraqi Educational Curriculum Integration, ChatGPT-like Audio Bar, Pinned & Archived History
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const chatContentArea = document.getElementById('chatContentArea');
  const emptyStateContainer = document.getElementById('emptyStateContainer');
  const emptyStudentGreeting = document.getElementById('emptyStudentGreeting');
  const messagesStreamList = document.getElementById('messagesStreamList');
  const chatTextInput = document.getElementById('chatTextInput');
  const actionPillBtn = document.getElementById('actionPillBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const attachmentPreviewDrawer = document.getElementById('attachmentPreviewDrawer');
  const micBtn = document.getElementById('micBtn');

  // --- Device & User Isolation (Every device has its own isolated conversations and profile) ---
  let deviceUserId = localStorage.getItem('leo_device_user_id');
  if (!deviceUserId) {
    deviceUserId = 'dev_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('leo_device_user_id', deviceUserId);
  }

  // Intercept only internal/local backend fetch requests to pass X-User-Id header
  // Crucial: NEVER inject custom headers into cross-origin requests (Firebase, Google APIs) to avoid CORS preflight blocks
  const _originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    options = options || {};
    try {
      const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
      const isLocal = !urlStr.startsWith('http://') && !urlStr.startsWith('https://') 
        || urlStr.startsWith(window.location.origin) 
        || urlStr.startsWith('/api') 
        || urlStr.startsWith('./api');

      if (isLocal) {
        options.headers = options.headers || {};
        if (typeof options.headers.append === 'function') {
          options.headers.append('X-User-Id', deviceUserId);
        } else {
          options.headers['X-User-Id'] = deviceUserId;
        }
      }
    } catch (e) {
      // Fallback cleanly
    }
    return _originalFetch(url, options);
  };

  // --- Reliable Local Persistent Storage + Firebase Cloud Sync ---
  function saveConversationToLocalCache(conv) {
    if (!conv || !conv.id) return;
    try {
      localStorage.setItem(`leo_conv_${conv.id}`, JSON.stringify(conv));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    // Instant Cloud Persistence to Firebase (Ensures conversations never disappear)
    if (window.LeoFirebase && typeof window.LeoFirebase.saveConversation === 'function') {
      window.LeoFirebase.saveConversation(conv).catch(() => {});
    }
  }

  function getConversationFromLocalCache(convId) {
    if (!convId) return null;
    try {
      const raw = localStorage.getItem(`leo_conv_${convId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function removeConversationFromLocalCache(convId) {
    if (!convId) return;
    try {
      localStorage.removeItem(`leo_conv_${convId}`);
    } catch (e) {}
    // Delete from Firebase Cloud
    if (window.LeoFirebase && typeof window.LeoFirebase.deleteConversation === 'function') {
      window.LeoFirebase.deleteConversation(convId).catch(() => {});
    }
  }

  function saveConversationsIndexToLocalCache(convs) {
    if (!Array.isArray(convs)) return;
    try {
      localStorage.setItem('leo_conversations_index', JSON.stringify(convs));
    } catch (e) {}
  }

  function getConversationsIndexFromLocalCache() {
    try {
      const raw = localStorage.getItem('leo_conversations_index');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Attachment Action Sheet Elements (Matches User Screenshot)
  const glowingInputBox = document.getElementById('glowingInputBox');
  const attachmentActionPanel = document.getElementById('attachmentActionPanel');
  const sheetFileBtn = document.getElementById('sheetFileBtn');
  const sheetAlbumBtn = document.getElementById('sheetAlbumBtn');
  const sheetCameraBtn = document.getElementById('sheetCameraBtn');
  const docFileInput = document.getElementById('docFileInput');
  const cameraInput = document.getElementById('cameraInput');
  const galleryThumbsRow = document.getElementById('galleryThumbsRow');
  const typewriterText = document.getElementById('typewriterText');
  const studySuggestionsGrid = document.getElementById('studySuggestionsGrid');

  // ChatGPT Audio Bar Elements
  const chatgptAudioBar = document.getElementById('chatgptAudioBar');
  const audioBarStatusText = document.getElementById('audioBarStatusText');
  const audioPauseBtn = document.getElementById('audioPauseBtn');
  const audioConfirmBtn = document.getElementById('audioConfirmBtn');
  const audioCancelBtn = document.getElementById('audioCancelBtn');

  // Header & Model Selector
  const modelSelectorPill = document.getElementById('modelSelectorPill');
  const modelSelectorWrapper = document.querySelector('.model-selector-wrapper');
  const currentModelLabel = document.getElementById('currentModelLabel');

  // Drawer
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebarDrawer = document.getElementById('sidebarDrawer');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const drawerNewChatBtn = document.getElementById('drawerNewChatBtn');
  const recentChatsList = document.getElementById('recentChatsList');
  const searchChatsBtn = document.getElementById('searchChatsBtn');
  const drawerSearchBox = document.getElementById('drawerSearchBox');
  const drawerSearchInput = document.getElementById('drawerSearchInput');
  const archivedChatsBtn = document.getElementById('archivedChatsBtn');
  const archivedNavLabel = document.getElementById('archivedNavLabel');
  const chatsSectionTitle = document.getElementById('chatsSectionTitle');
  const toggleArchivedViewBtn = document.getElementById('toggleArchivedViewBtn');
  const drawerProfileCard = document.getElementById('drawerProfileCard');
  const drawerProfileName = document.getElementById('drawerProfileName');
  const drawerProfileStageBadge = document.getElementById('drawerProfileStageBadge');
  const drawerAvatarLetter = document.getElementById('drawerAvatarLetter');

  // Settings Screen
  const settingsScreen = document.getElementById('settingsScreen');
  const settingsBackBtn = document.getElementById('settingsBackBtn');
  const settingsUsernameText = document.getElementById('settingsUsernameText');
  const settingsNamePill = document.getElementById('settingsNamePill');
  const settingsStudentStagePill = document.getElementById('settingsStudentStagePill');
  const settingsAvatarLetterLarge = document.getElementById('settingsAvatarLetterLarge');
  const avatarEditBadgeBtn = document.getElementById('avatarEditBadgeBtn');
  const studentProfileRow = document.getElementById('studentProfileRow');
  const customizationRow = document.getElementById('customizationRow');
  const clearMemoryRow = document.getElementById('clearMemoryRow');
  const appearanceRow = document.getElementById('appearanceRow');
  const currentAppearanceLabel = document.getElementById('currentAppearanceLabel');
  const bubbleThemeRow = document.getElementById('bubbleThemeRow');
  const currentBubbleThemeLabel = document.getElementById('currentBubbleThemeLabel');
  const reportBugRow = document.getElementById('reportBugRow');
  const logoutRow = document.getElementById('logoutRow');
  const drawerQuickLogoutBtn = document.getElementById('drawerQuickLogoutBtn');

  // Long-Term Memory & History UI
  const longTermMemoryRow = document.getElementById('longTermMemoryRow');
  const memoryCountSubtitle = document.getElementById('memoryCountSubtitle');
  const clearChatHistoryRow = document.getElementById('clearChatHistoryRow');
  const memoryModalOverlay = document.getElementById('memoryModalOverlay');
  const memoryModalCloseBtn = document.getElementById('memoryModalCloseBtn');
  const manualMemoryInput = document.getElementById('manualMemoryInput');
  const addManualMemoryBtn = document.getElementById('addManualMemoryBtn');
  const memoryItemsList = document.getElementById('memoryItemsList');
  const clearAllMemoriesBtn = document.getElementById('clearAllMemoriesBtn');

  // Image Lightbox Modal Viewer
  const imageLightboxModal = document.getElementById('imageLightboxModal');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxZoomOutBtn = document.getElementById('lightboxZoomOutBtn');
  const lightboxZoomInBtn = document.getElementById('lightboxZoomInBtn');
  const lightboxZoomLevel = document.getElementById('lightboxZoomLevel');
  const lightboxResetBtn = document.getElementById('lightboxResetBtn');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');

  // Modals & Toast
  // Full-Screen Auth & Onboarding Elements (ChatGPT Style)
  const authFullscreenScreen = document.getElementById('authFullscreenScreen');
  const authFullscreenCloseBtn = document.getElementById('authFullscreenCloseBtn');
  const authStep1 = document.getElementById('authStep1');
  const authStep2 = document.getElementById('authStep2');
  const authGoogleBtn = document.getElementById('authGoogleBtn');
  const authTabLogin = document.getElementById('authTabLogin');
  const authTabSignup = document.getElementById('authTabSignup');
  const authEmailInput = document.getElementById('authEmailInput');
  const authPasswordInput = document.getElementById('authPasswordInput');
  const authEmailSubmitBtn = document.getElementById('authEmailSubmitBtn');
  const authEmailSubmitText = document.getElementById('authEmailSubmitText');
  const authGuestBypassBtn = document.getElementById('authGuestBypassBtn');
  const profStudyModeSelect = document.getElementById('profStudyModeSelect');

  const profNameInput = document.getElementById('profNameInput');
  const profStageSelect = document.getElementById('profStageSelect');
  const profGradeSubSelect = document.getElementById('profGradeSubSelect');
  const profSpecializationWrapper = document.getElementById('profSpecializationWrapper');
  const profSpecializationInput = document.getElementById('profSpecializationInput');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  // In-App Custom Confirm Modal (Replaces browser confirm())
  const appConfirmModal = document.getElementById('appConfirmModal');
  const confirmDialogTitle = document.getElementById('confirmDialogTitle');
  const confirmDialogDesc = document.getElementById('confirmDialogDesc');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmOkBtn = document.getElementById('confirmOkBtn');
  let pendingConfirmAction = null;

  function showCustomConfirm({ title = 'تأكيد الإجراء', message = '', okText = 'تأكيد الحذف', cancelText = 'إلغاء', danger = true, onConfirm = null }) {
    if (!appConfirmModal) {
      if (confirm(message)) {
        if (typeof onConfirm === 'function') onConfirm();
      }
      return;
    }
    confirmDialogTitle.textContent = title;
    confirmDialogDesc.textContent = message;
    confirmOkBtn.textContent = okText;
    confirmCancelBtn.textContent = cancelText;

    if (danger) {
      confirmOkBtn.className = 'confirm-btn confirm-btn-danger';
    } else {
      confirmOkBtn.className = 'confirm-btn';
      confirmOkBtn.style.background = '#4f46e5';
      confirmOkBtn.style.color = '#ffffff';
    }

    pendingConfirmAction = onConfirm;
    appConfirmModal.classList.add('active');
  }

  function hideCustomConfirm() {
    if (appConfirmModal) appConfirmModal.classList.remove('active');
    pendingConfirmAction = null;
  }

  if (confirmCancelBtn) confirmCancelBtn.onclick = hideCustomConfirm;
  if (confirmOkBtn) {
    confirmOkBtn.onclick = () => {
      const act = pendingConfirmAction;
      hideCustomConfirm();
      if (typeof act === 'function') act();
    };
  }
  if (appConfirmModal) {
    appConfirmModal.onclick = (e) => {
      if (e.target === appConfirmModal) hideCustomConfirm();
    };
  }

  const customModalOverlay = document.getElementById('customModalOverlay');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const toastNotification = document.getElementById('toastNotification');

  // --- Iraqi Educational Stages Definition ---
  const IRAQI_STAGES_DATA = {
    primary: {
      name: "المرحلة الابتدائية",
      grades: [
        { id: "first_primary", label: "الصف الأول الابتدائي" },
        { id: "second_primary", label: "الصف الثاني الابتدائي" },
        { id: "third_primary", label: "الصف الثالث الابتدائي" },
        { id: "fourth_primary", label: "الصف الرابع الابتدائي" },
        { id: "fifth_primary", label: "الصف الخامس الابتدائي" },
        { id: "sixth_primary", label: "الصف السادس الابتدائي (وزاري)" }
      ]
    },
    middle: {
      name: "المرحلة المتوسطة",
      grades: [
        { id: "first_middle", label: "الصف الأول متوسط" },
        { id: "second_middle", label: "الصف الثاني متوسط" },
        { id: "third_middle", label: "الصف الثالث متوسط (وزاري)" }
      ]
    },
    preparatory: {
      name: "المرحلة الإعدادية",
      grades: [
        { id: "fourth_scientific", label: "الرابع الإعدادي (العلمي)" },
        { id: "fourth_literary", label: "الرابع الإعدادي (الأدبي)" },
        { id: "fifth_scientific", label: "الخامس الإعدادي (العلمي)" },
        { id: "fifth_literary", label: "الخامس الإعدادي (الأدبي)" },
        { id: "sixth_scientific", label: "السادس الإعدادي (العلمي - بكالوريا وزاري)" },
        { id: "sixth_literary", label: "السادس الإعدادي (الأدبي - بكالوريا وزاري)" },
        { id: "sixth_vocational", label: "السادس الإعدادي (المهني / صناعي / تجاري)" }
      ]
    },
    university: {
      name: "المرحلة الجامعية",
      grades: [
        { id: "uni_stage_1", label: "المرحلة الأولى" },
        { id: "uni_stage_2", label: "المرحلة الثانية" },
        { id: "uni_stage_3", label: "المرحلة الثالثة" },
        { id: "uni_stage_4", label: "المرحلة الرابعة" },
        { id: "uni_stage_5", label: "المرحلة الخامسة (طب / هندسة)" },
        { id: "uni_stage_6", label: "المرحلة السادسة (طب بشري)" },
        { id: "postgraduate", label: "الدراسات العليا (ماجستير / دكتوراه)" }
      ]
    }
  };

  // --- State Variables ---
  let currentConversationId = localStorage.getItem('leo_active_conv_id') || null;
  let selectedModel = localStorage.getItem('leo_selected_model') || 'leo-4o-mini';
  let isGenerating = false;
  let activeAbortController = null;
  let pendingAttachments = [];
  let isRecording = false;
  let isTTSPlaying = false;
  let speechRec = null;
  let isAudioPaused = false;
  let viewingArchived = false;

  // Active Smooth Streaming Controller
  let activeStreamer = null;

  // Student Profile State (Strictly null until authenticated/filled — no dummy data!)
  let studentProfile = null;

  // Settings State
  let settingsState = {
    studyMode: 'standard',
    temperature: 0.7,
    appearance: 'dark',
    bubbleTheme: 'theme-blue-pink'
  };

  const bubbleThemes = [
    { id: 'theme-blue-pink', name: 'Blue · Pink', preview: 'radial-gradient(circle at 40% 40%, #38bdf8 0%, #ec4899 70%, #8b5cf6 100%)' },
    { id: 'theme-purple-violet', name: 'Purple · Violet', preview: 'radial-gradient(circle at 40% 40%, #c084fc 0%, #a855f7 70%, #6366f1 100%)' },
    { id: 'theme-emerald-cyan', name: 'Emerald · Cyan', preview: 'radial-gradient(circle at 40% 40%, #10b981 0%, #06b6d4 70%, #3b82f6 100%)' },
    { id: 'theme-sunset-gold', name: 'Sunset · Gold', preview: 'radial-gradient(circle at 40% 40%, #f59e0b 0%, #f43f5e 70%, #ec4899 100%)' }
  ];

  // --- Configure Marked.js ---
  if (window.marked) {
    const renderer = new marked.Renderer();
    renderer.code = function(code, lang) {
      const language = (lang || 'code').toLowerCase();
      let highlighted = code;
      if (window.hljs) {
        if (lang && hljs.getLanguage(lang)) {
          try { highlighted = hljs.highlight(code, { language: lang }).value; } catch (e) {}
        } else {
          try { highlighted = hljs.highlightAuto(code).value; } catch (e) {}
        }
      }

      const escapedCode = code.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `
        <div class="code-block-container">
          <div class="code-block-header">
            <span class="code-language-tag">${language}</span>
            <button class="copy-code-btn" data-code="${escapedCode}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>نسخ الكود</span>
            </button>
          </div>
          <pre><code class="hljs ${language}">${highlighted}</code></pre>
        </div>
      `;
    };

    marked.setOptions({ renderer: renderer, breaks: true, gfm: true });
  }

  // --- Toast Notification ---
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastNotification.textContent = msg;
    toastNotification.classList.add('show');
    toastTimer = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 2400);
  }

  // --- Auto-Resize Textarea & Enter Key Handling ---
  function autoResizeTextarea() {
    chatTextInput.style.height = 'auto';
    const newHeight = Math.min(Math.max(chatTextInput.scrollHeight, 36), 130);
    chatTextInput.style.height = newHeight + 'px';
  }

  chatTextInput.addEventListener('input', () => {
    autoResizeTextarea();
    const val = chatTextInput.value.trim();
    if (val.length > 0 || pendingAttachments.length > 0) {
      if (!isGenerating) actionPillBtn.classList.add('send-mode');
    } else {
      if (!isGenerating) actionPillBtn.classList.remove('send-mode');
    }
  });

  // Enter handling: Ctrl+Enter sends with strict double-send prevention, plain Enter adds newline
  chatTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (!isSubmitting && !isGenerating) {
          handleSendPrompt();
        }
      } else {
        // Plain Enter adds a line break (مسافة سطر) and DOES NOT send
        setTimeout(autoResizeTextarea, 0);
      }
    }
  });

  // Action pill click (Waveform / Send / Stop) with rapid double-click guard
  let lastActionPillClick = 0;
  actionPillBtn.addEventListener('click', () => {
    const clickTime = Date.now();
    if (clickTime - lastActionPillClick < 350) return; // Prevent accidental rapid double-clicks
    lastActionPillClick = clickTime;

    if (isGenerating) {
      if (activeStreamer) {
        activeStreamer.cancel();
        activeStreamer = null;
      }
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      isGenerating = false;
      actionPillBtn.classList.remove('generating-mode');
      showToast('تم إيقاف التوليد');
      return;
    }

    if (actionPillBtn.classList.contains('send-mode')) {
      if (!isSubmitting && !isGenerating) {
        handleSendPrompt();
      }
    } else {
      toggleVoiceRecording();
    }
  });

  // --- Attachments & Screenshot-Style Action Panel ---
  if (attachBtn) {
    attachBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = attachmentActionPanel && attachmentActionPanel.style.display === 'flex';
      if (isVisible) {
        attachmentActionPanel.style.display = 'none';
        glowingInputBox.classList.remove('elevated');
      } else if (attachmentActionPanel) {
        attachmentActionPanel.style.display = 'flex';
        glowingInputBox.classList.add('elevated');
      }
    });
  }

  // Close attachment panel when clicking outside
  document.addEventListener('click', (e) => {
    if (attachmentActionPanel && !attachmentActionPanel.contains(e.target) && !attachBtn.contains(e.target)) {
      attachmentActionPanel.style.display = 'none';
      if (glowingInputBox) glowingInputBox.classList.remove('elevated');
    }
  });

  // Action Panel Trio Buttons
  if (sheetAlbumBtn) {
    sheetAlbumBtn.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }
  if (sheetFileBtn) {
    sheetFileBtn.addEventListener('click', () => {
      if (docFileInput) docFileInput.click();
    });
  }
  if (sheetCameraBtn) {
    sheetCameraBtn.addEventListener('click', () => {
      if (cameraInput) cameraInput.click();
    });
  }

  // Gallery Thumbnails Selection
  if (galleryThumbsRow) {
    galleryThumbsRow.querySelectorAll('.gallery-thumb-card').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const title = thumb.dataset.title || 'مسألة دراسية';
        thumb.classList.toggle('selected');
        chatTextInput.value = `أستاذ ليو، أرجو توضيح وشرح الحل النموذجي لهذه الجزئية بالتفصيل: ${title}`;
        autoResizeTextarea();
        actionPillBtn.classList.add('send-mode');
        if (attachmentActionPanel) attachmentActionPanel.style.display = 'none';
        if (glowingInputBox) glowingInputBox.classList.remove('elevated');
        showToast(`تم اختيار موضوع: ${title}`);
      });
    });
  }

  // Study Suggestions Grid Click Handlers (ChatGPT / DeepSeek Style)
  if (studySuggestionsGrid) {
    studySuggestionsGrid.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt;
        if (prompt) {
          chatTextInput.value = prompt;
          autoResizeTextarea();
          actionPillBtn.classList.add('send-mode');
          handleSendPrompt();
        }
      });
    });
  }

  function handleFileSelected(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      pendingAttachments.push({
        name: file.name,
        type: file.type || 'image/jpeg',
        size: file.size,
        data: evt.target.result
      });
      renderAttachmentChips();
      actionPillBtn.classList.add('send-mode');
      if (attachmentActionPanel) attachmentActionPanel.style.display = 'none';
      if (glowingInputBox) glowingInputBox.classList.remove('elevated');
      showToast('تم إرفاق الملف؛ سيقوم الأستاذ ليو بفحصه بدقة');
    };
    reader.readAsDataURL(file);
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFileSelected(e.target.files[0]);
      fileInput.value = '';
    });
  }
  if (docFileInput) {
    docFileInput.addEventListener('change', (e) => {
      handleFileSelected(e.target.files[0]);
      docFileInput.value = '';
    });
  }
  if (cameraInput) {
    cameraInput.addEventListener('change', (e) => {
      handleFileSelected(e.target.files[0]);
      cameraInput.value = '';
    });
  }

  function renderAttachmentChips() {
    attachmentPreviewDrawer.innerHTML = '';
    pendingAttachments.forEach((att, index) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      chip.innerHTML = `
        <img class="attachment-chip-thumb" src="${att.data}" alt="${att.name}" />
        <span>${att.name.length > 15 ? att.name.substring(0, 12) + '...' : att.name}</span>
        <button class="attachment-remove-btn" data-index="${index}" title="إزالة"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      `;
      attachmentPreviewDrawer.appendChild(chip);
    });

    attachmentPreviewDrawer.querySelectorAll('.attachment-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        pendingAttachments.splice(idx, 1);
        renderAttachmentChips();
        if (pendingAttachments.length === 0 && chatTextInput.value.trim().length === 0) {
          actionPillBtn.classList.remove('send-mode');
        }
      });
    });
  }

  // --- Web Audio Synthesized Chime ---
  function playAudioTone(type = 'start') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);
        gain.gain.setValueAtTime(0.10, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) {}
  }

  // --- ChatGPT Audio Activity Bar Management ---
  function showAudioBar(text, isTTS = false) {
    chatgptAudioBar.style.display = 'flex';
    audioBarStatusText.textContent = text;
    audioPauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
    isAudioPaused = false;
    if (isTTS) {
      audioConfirmBtn.style.display = 'none'; // only pause and close for TTS
    } else {
      audioConfirmBtn.style.display = 'flex';
    }
  }

  function hideAudioBar() {
    chatgptAudioBar.style.display = 'none';
  }

  // --- Active Dynamic Edge-TTS Audio Player State ---
  let currentActiveTTSAudio = null;
  let currentActiveSpeakBtn = null;
  const speakerDefaultSvg = `<svg class="speaker-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
  const speakerPlayingSvg = `<svg class="stop-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>`;
  const speakerLoadingSvg = `<svg class="tts-spin-anim" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>`;

  function stopActiveTTSAudio() {
    if (currentActiveTTSAudio) {
      currentActiveTTSAudio.pause();
      currentActiveTTSAudio.currentTime = 0;
      currentActiveTTSAudio = null;
    }
    if (currentActiveSpeakBtn) {
      currentActiveSpeakBtn.classList.remove('playing-audio', 'loading-audio');
      currentActiveSpeakBtn.innerHTML = speakerDefaultSvg;
      currentActiveSpeakBtn.title = 'استماع إلى إجابة الأستاذ ليو';
      currentActiveSpeakBtn = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isTTSPlaying = false;
    hideAudioBar();
  }

  audioCancelBtn.addEventListener('click', () => {
    if (isRecording && speechRec) {
      speechRec.abort();
      isRecording = false;
      micBtn.classList.remove('recording');
    }
    stopActiveTTSAudio();
    showToast('تم إيقاف الصوت');
  });

  audioPauseBtn.addEventListener('click', () => {
    if (currentActiveTTSAudio) {
      if (currentActiveTTSAudio.paused) {
        currentActiveTTSAudio.play();
        audioPauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
        audioBarStatusText.textContent = 'الأستاذ ليو يواصل القراءة...';
      } else {
        currentActiveTTSAudio.pause();
        audioPauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        audioBarStatusText.textContent = 'تم إيقاف القراءة مؤقتاً';
      }
      return;
    }

    if (isTTSPlaying && window.speechSynthesis) {
      if (isAudioPaused) {
        window.speechSynthesis.resume();
        audioPauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
        isAudioPaused = false;
        audioBarStatusText.textContent = 'الأستاذ ليو يواصل القراءة...';
      } else {
        window.speechSynthesis.pause();
        audioPauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        isAudioPaused = true;
        audioBarStatusText.textContent = 'تم إيقاف القراءة مؤقتاً';
      }
      return;
    }

    if (isRecording && speechRec) {
      if (isAudioPaused) {
        speechRec.start();
        audioPauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
        isAudioPaused = false;
        audioBarStatusText.textContent = 'الأستاذ ليو يستمع إليك...';
      } else {
        speechRec.stop();
        audioPauseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        isAudioPaused = true;
        audioBarStatusText.textContent = 'الاستماع متوقف مؤقتاً';
      }
    }
  });

  audioConfirmBtn.addEventListener('click', () => {
    if (isRecording && speechRec) {
      speechRec.stop();
      isRecording = false;
      micBtn.classList.remove('recording');
    }
    hideAudioBar();
    if (chatTextInput.value.trim().length > 0) {
      handleSendPrompt();
    }
  });

  // --- Voice Input (Microphone) ---
  function toggleVoiceRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      chatTextInput.value = 'أستاذ ليو، اشرح لي هذه المسألة بالتفصيل خطوة بخطوة';
      autoResizeTextarea();
      actionPillBtn.classList.add('send-mode');
      showToast('تم إدراج سؤال تعليمي للأستاذ ليو');
      return;
    }

    if (isRecording) {
      if (speechRec) speechRec.stop();
      isRecording = false;
      playAudioTone('stop');
      micBtn.classList.remove('recording');
      hideAudioBar();
      return;
    }

    try {
      speechRec = new SpeechRecognition();
      speechRec.lang = 'ar-SA';
      speechRec.interimResults = true;

      speechRec.onstart = () => {
        isRecording = true;
        playAudioTone('start');
        micBtn.classList.add('recording');
        showAudioBar('الأستاذ ليو يستمع إليك... تحدث الآن');
      };

      speechRec.onresult = (evt) => {
        const transcript = Array.from(evt.results)
          .map(r => r[0].transcript)
          .join('');
        chatTextInput.value = transcript;
        autoResizeTextarea();
        actionPillBtn.classList.add('send-mode');
        audioBarStatusText.textContent = transcript || 'الأستاذ ليو يستمع...';
      };

      speechRec.onerror = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        hideAudioBar();
      };

      speechRec.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
      };

      speechRec.start();
    } catch (err) {
      console.warn('Speech error:', err);
    }
  }

  micBtn.addEventListener('click', toggleVoiceRecording);

  // --- Render Messages Stream Helper ---
  function renderConversationMessages(messages) {
    messagesStreamList.innerHTML = '';
    if (!messages || messages.length === 0) {
      showEmptyState();
      return;
    }
    emptyStateContainer.style.display = 'none';
    messages.forEach(msg => {
      if (msg.role === 'user') {
        appendUserMessage(msg.content, msg.attachments, msg.id);
      } else {
        renderStoredAssistantMessage(msg.content, msg.id);
      }
    });
    scrollToBottom();
  }

  // --- Refresh Sidebar Conversation List Only (Does NOT touch or clear the active chat) ---
  async function refreshConversationListOnly() {
    try {
      const res = await fetch(`/api/conversations?archived=${viewingArchived}`);
      if (!res.ok) return;
      const convs = await res.json();
      saveConversationsIndexToLocalCache(convs);
      renderRecentConversations(convs);
    } catch (err) {
      console.warn('Failed to refresh conversation list:', err);
    }
  }

  // --- Load Persistent Conversations (Firebase Cloud + Local Offline + Server) ---
  async function loadConversationHistory() {
    try {
      // 0. Instant Render: Local Cache Index (0ms latency)
      const cachedIndex = getConversationsIndexFromLocalCache();
      if (cachedIndex && cachedIndex.length > 0) {
        const filteredCached = viewingArchived ? cachedIndex.filter(c => c.archived) : cachedIndex.filter(c => !c.archived);
        renderRecentConversations(filteredCached);
      }

      // 1. Fetch from Firebase Cloud Storage
      let convs = null;
      if (window.LeoFirebase && typeof window.LeoFirebase.getAllConversations === 'function') {
        try {
          const cloudList = await window.LeoFirebase.getAllConversations();
          if (Array.isArray(cloudList) && cloudList.length > 0) {
            convs = cloudList;
          }
        } catch (e) {
          console.warn('Firebase conversation load notice:', e);
        }
      }

      // 2. Fallback to server API if Firebase had no entries yet
      if (!convs) {
        try {
          const res = await fetch(`/api/conversations?archived=${viewingArchived}`);
          if (res.ok) {
            convs = await res.json();
          }
        } catch (e) {}
      }

      if (!convs) {
        convs = cachedIndex || [];
      }

      saveConversationsIndexToLocalCache(convs);
      const filtered = viewingArchived ? convs.filter(c => c.archived) : convs.filter(c => !c.archived);
      renderRecentConversations(filtered);

      if (currentConversationId) {
        const exists = convs.find(c => c.id === currentConversationId);
        if (exists) {
          openConversation(currentConversationId);
        } else if (filtered.length > 0) {
          const localDraft = getConversationFromLocalCache(currentConversationId);
          if (localDraft && localDraft.messages && localDraft.messages.length > 0) {
            renderConversationMessages(localDraft.messages);
          } else {
            openConversation(filtered[0].id);
          }
        } else {
          const localDraft = getConversationFromLocalCache(currentConversationId);
          if (localDraft && localDraft.messages && localDraft.messages.length > 0) {
            renderConversationMessages(localDraft.messages);
          } else {
            showEmptyState();
          }
        }
      } else if (filtered.length > 0) {
        openConversation(filtered[0].id);
      } else {
        showEmptyState();
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      const cachedIndex = getConversationsIndexFromLocalCache();
      if (cachedIndex) renderRecentConversations(cachedIndex);
      if (currentConversationId) {
        const localDraft = getConversationFromLocalCache(currentConversationId);
        if (localDraft && localDraft.messages && localDraft.messages.length > 0) {
          renderConversationMessages(localDraft.messages);
        }
      }
    }
  }

  function renderRecentConversations(convs) {
    recentChatsList.innerHTML = '';
    if (!convs || convs.length === 0) {
      recentChatsList.innerHTML = `<div style="color: #71717a; font-size: 13px; padding: 10px;">${viewingArchived ? 'لا توجد محادثات مؤرشفة' : 'لا توجد محادثات سابقة'}</div>`;
      return;
    }

    convs.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'chat-history-item' + (conv.id === currentConversationId ? ' active' : '') + (conv.pinned ? ' pinned' : '');
      item.dataset.id = conv.id;

      item.innerHTML = `
        <div class="chat-title-group">
          ${conv.pinned ? '<span class="chat-pin-icon" title="مثبتة"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17v5M5 17h14v-2l-3-3V4h1V2H7v2h1v8l-3 3v2z"/></svg></span>' : ''}
          <span class="chat-title">${conv.title || 'محادثة دراسية'}</span>
        </div>
        <div class="chat-actions-group">
          <!-- Pin -->
          <button class="chat-act-btn pin" title="${conv.pinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${conv.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-2l-3-3V4h1V2H7v2h1v8l-3 3v2z"></path></svg>
          </button>
          <!-- Rename -->
          <button class="chat-act-btn edit" title="إعادة تسمية">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <!-- Archive -->
          <button class="chat-act-btn archive" title="${conv.archived ? 'إلغاء الأرشفة' : 'أرشفة'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
          </button>
          <!-- Delete -->
          <button class="chat-act-btn del" title="حذف">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.chat-actions-group')) return;
        openConversation(conv.id);
        closeSidebar();
      });

      // Actions Bindings
      item.querySelector('.pin').onclick = async (e) => {
        e.stopPropagation();
        const newPinned = !conv.pinned;
        conv.pinned = newPinned;
        if (window.LeoFirebase) {
          window.LeoFirebase.updateConversation(conv.id, { pinned: newPinned }).catch(() => {});
        }
        fetch(`/api/conversations/${conv.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned: newPinned })
        }).catch(() => {});
        showToast(newPinned ? 'تم تثبيت المحادثة في الأعلى' : 'تم إلغاء التثبيت');
        refreshConversationListOnly();
      };

      item.querySelector('.edit').onclick = (e) => {
        e.stopPropagation();
        const newTitle = prompt('أدخل الاسم الجديد للمحادثة:', conv.title);
        if (newTitle && newTitle.trim()) {
          const finalTitle = newTitle.trim();
          conv.title = finalTitle;
          if (window.LeoFirebase) {
            window.LeoFirebase.updateConversation(conv.id, { title: finalTitle }).catch(() => {});
          }
          fetch(`/api/conversations/${conv.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: finalTitle })
          }).catch(() => {});
          showToast('تمت إعادة تسمية المحادثة');
          const cached = getConversationFromLocalCache(conv.id);
          if (cached) {
            cached.title = finalTitle;
            saveConversationToLocalCache(cached);
          }
          refreshConversationListOnly();
        }
      };

      item.querySelector('.archive').onclick = async (e) => {
        e.stopPropagation();
        const newArchived = !conv.archived;
        conv.archived = newArchived;
        if (window.LeoFirebase) {
          window.LeoFirebase.updateConversation(conv.id, { archived: newArchived }).catch(() => {});
        }
        fetch(`/api/conversations/${conv.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: newArchived })
        }).catch(() => {});
        showToast(newArchived ? 'تمت أرشفة المحادثة' : 'تم استرجاع المحادثة من الأرشيف');
        refreshConversationListOnly();
      };

      item.querySelector('.del').onclick = (e) => {
        e.stopPropagation();
        showCustomConfirm({
          title: 'حذف المحادثة',
          message: `هل تريد حذف محادثة "${conv.title}" نهائياً من سجلك الدراسي؟`,
          okText: 'تأكيد الحذف',
          danger: true,
          onConfirm: async () => {
            if (window.LeoFirebase) {
              window.LeoFirebase.deleteConversation(conv.id).catch(() => {});
            }
            fetch(`/api/conversations/${conv.id}`, { method: 'DELETE' }).catch(() => {});
            removeConversationFromLocalCache(conv.id);
            showToast('تم حذف المحادثة');
            if (currentConversationId === conv.id) {
              currentConversationId = null;
              localStorage.removeItem('leo_active_conv_id');
              showEmptyState();
            }
            refreshConversationListOnly();
          }
        });
      };

      recentChatsList.appendChild(item);
    });
  }

  // Toggle Archived View
  toggleArchivedViewBtn.addEventListener('click', () => {
    viewingArchived = !viewingArchived;
    chatsSectionTitle.textContent = viewingArchived ? 'المحادثات المؤرشفة' : 'المحادثات';
    toggleArchivedViewBtn.textContent = viewingArchived ? 'عرض النشطة' : 'عرض الأرشيف';
    loadConversationHistory();
  });

  archivedChatsBtn.addEventListener('click', () => {
    viewingArchived = true;
    chatsSectionTitle.textContent = 'المحادثات المؤرشفة';
    toggleArchivedViewBtn.textContent = 'عرض النشطة';
    loadConversationHistory();
    showToast('تم الانتقال إلى المحادثات المؤرشفة');
  });

  async function openConversation(convId) {
    currentConversationId = convId;
    localStorage.setItem('leo_active_conv_id', convId);

    document.querySelectorAll('.chat-history-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === convId);
    });

    // 1. Instant Cache Render: Render cached messages immediately in 0ms!
    const cachedConv = getConversationFromLocalCache(convId);
    if (cachedConv && cachedConv.messages && cachedConv.messages.length > 0) {
      renderConversationMessages(cachedConv.messages);
    }

    // 2. Fetch from Firebase Cloud or server to sync latest updates
    try {
      if (window.LeoFirebase && typeof window.LeoFirebase.getConversation === 'function') {
        const cloudConv = await window.LeoFirebase.getConversation(convId);
        if (cloudConv && Array.isArray(cloudConv.messages) && cloudConv.messages.length > 0) {
          saveConversationToLocalCache(cloudConv);
          renderConversationMessages(cloudConv.messages);
          return;
        }
      }

      const res = await fetch(`/api/conversations/${convId}`);
      if (!res.ok) {
        if (!cachedConv || !cachedConv.messages || cachedConv.messages.length === 0) {
          throw new Error('Not found');
        }
        return;
      }
      const conv = await res.json();
      saveConversationToLocalCache(conv);

      if (!conv.messages || conv.messages.length === 0) {
        if (!cachedConv || !cachedConv.messages || cachedConv.messages.length === 0) {
          showEmptyState();
        }
      } else {
        renderConversationMessages(conv.messages);
      }
    } catch (err) {
      if (!cachedConv || !cachedConv.messages || cachedConv.messages.length === 0) {
        showEmptyState();
      }
    }
  }

  let typewriterInterval = null;
  function runTypewriterEffect(targetString) {
    if (!typewriterText) return;
    if (typewriterInterval) clearInterval(typewriterInterval);
    typewriterText.textContent = '';
    let idx = 0;
    typewriterInterval = setInterval(() => {
      if (idx < targetString.length) {
        typewriterText.textContent += targetString.charAt(idx);
        idx++;
      } else {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
      }
    }, 45);
  }

  function showEmptyState() {
    messagesStreamList.innerHTML = '';
    emptyStateContainer.style.display = 'flex';
    const name = (studentProfile && studentProfile.name) ? studentProfile.name.trim() : '';
    const phrase = name ? `هل أنت مستعد، ${name}؟` : 'هل أنت مستعد؟';
    runTypewriterEffect(phrase);
  }

  // --- Safe Markdown Parser for Streaming (handles unclosed code blocks gracefully) ---
  function safeParseMarkdown(mdText) {
    if (!window.marked) return mdText;
    try {
      const fenceMatches = mdText.match(/```/g);
      const fenceCount = fenceMatches ? fenceMatches.length : 0;
      let textToParse = mdText;
      if (fenceCount % 2 !== 0) {
        textToParse += '\n```';
      }
      return marked.parse(textToParse);
    } catch (e) {
      try {
        return marked.parse(mdText);
      } catch (e2) {
        return mdText;
      }
    }
  }

  // --- Silky-Smooth Progressive Streaming Engine (ChatGPT & Claude Style) ---
  class SmoothTextStreamer {
    constructor({ textElem, cursorElem, onDone }) {
      this.textElem = textElem;
      this.cursorElem = cursorElem;
      this.onDone = onDone;
      this.buffer = '';
      this.revealed = '';
      this.isNetworkDone = false;
      this.isAborted = false;
      this.rafId = null;
    }

    append(textChunk) {
      if (this.isAborted) return;
      this.buffer += textChunk;
      // If the incoming text contains a rich HTML card, reveal immediately without typewriter delay
      if (textChunk.includes('chat-dalle-generating-box') || textChunk.includes('chat-dalle-result-card') || textChunk.includes('chat-image-generating-card') || textChunk.includes('chat-image-card-container')) {
        this.revealed = this.buffer;
        this.textElem.innerHTML = safeParseMarkdown(this.revealed);
        if (this.cursorElem) this.textElem.appendChild(this.cursorElem);
        animateDalleProgress(this.textElem);
        scrollToBottom(true);
        return;
      }
      if (!this.rafId) {
        this.run();
      }
    }

    replace(newContent) {
      if (this.isAborted) return;
      this.buffer = newContent;
      this.revealed = newContent;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      stopDalleProgress();
      this.textElem.innerHTML = safeParseMarkdown(newContent);
      if (this.cursorElem) {
        this.textElem.appendChild(this.cursorElem);
      }
      bindCopyCodeButtons(this.textElem);
      scrollToBottom(true);
    }

    finish() {
      this.isNetworkDone = true;
      if (!this.rafId && this.revealed.length >= this.buffer.length) {
        this.finalize();
      }
    }

    cancel() {
      this.isAborted = true;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.finalize();
    }

    run() {
      const step = () => {
        if (this.isAborted) return;

        const remaining = this.buffer.length - this.revealed.length;

        if (remaining > 0) {
          // Dynamic adaptive typewriter cadence:
          // Smooth progressive typing stream (chatgpt/claude style)
          let stepSize = 1;
          if (remaining > 400) {
            stepSize = Math.ceil(remaining / 10);
          } else if (remaining > 180) {
            stepSize = 6;
          } else if (remaining > 80) {
            stepSize = 4;
          } else if (remaining > 30) {
            stepSize = 2;
          } else {
            stepSize = 1;
          }

          this.revealed = this.buffer.slice(0, this.revealed.length + stepSize);

          // Render progressive Markdown safely without breaking on partial code blocks
          this.textElem.innerHTML = safeParseMarkdown(this.revealed);

          // Keep glowing typing cursor affixed at the active typing tip
          if (this.cursorElem) {
            this.textElem.appendChild(this.cursorElem);
          }

          bindCopyCodeButtons(this.textElem);
          scrollToBottom(true);
        }

        // When all incoming characters have been smoothly revealed and stream is finished
        if (this.isNetworkDone && this.revealed.length >= this.buffer.length) {
          this.finalize();
          return;
        }

        this.rafId = requestAnimationFrame(step);
      };

      this.rafId = requestAnimationFrame(step);
    }

    finalize() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.cursorElem && this.cursorElem.parentNode) {
        this.cursorElem.remove();
      }
      const finalText = this.buffer || this.revealed;
      this.textElem.innerHTML = safeParseMarkdown(finalText);
      bindCopyCodeButtons(this.textElem);
      scrollToBottom(true);
      if (this.onDone) {
        this.onDone(finalText);
      }
    }
  }

  // --- Send Message & Progressive Streaming (Instant Optimistic UI + Deduplication Protection) ---
  let isSubmitting = false;

  async function handleSendPrompt(retryPromptText = null, retryAttachments = null) {
    if (isSubmitting || isGenerating) return;

    const text = (retryPromptText !== null) ? retryPromptText : chatTextInput.value.trim();
    const attachmentsToSend = (retryAttachments !== null) ? retryAttachments : [...pendingAttachments];

    if (!text && attachmentsToSend.length === 0) return;

    // Strict Authentication & Profile Gate (No dummy data allowed)
    if (!studentProfile || !studentProfile.name || !studentProfile.name.trim() || studentProfile.name.trim() === 'الطالب') {
      openProfileModal(true);
      showToast('يرجى تسجيل الدخول وإدخال بياناتك الدراسية أولاً للمتابعة!');
      return;
    }

    isSubmitting = true;

    // Reset composer immediately
    if (retryPromptText === null) {
      chatTextInput.value = '';
      autoResizeTextarea();
      pendingAttachments = [];
      renderAttachmentChips();
      actionPillBtn.classList.remove('send-mode');
    }
    emptyStateContainer.style.display = 'none';

    // Unique stable message IDs
    const userMsgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const assistantMsgId = 'msg_' + (Date.now() + 2) + '_' + Math.random().toString(36).substring(2, 7);
    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Append User Message Immediately (unless it was already in DOM from a retry)
    if (retryPromptText === null) {
      appendUserMessage(text, attachmentsToSend, userMsgId);
      scrollToBottom();
    }

    // Prepare Assistant Slot for Streaming
    const { messageRow, textElem, actionsElem, cursorElem } = createAssistantSlot(assistantMsgId);
    scrollToBottom();

    // Immediately cache optimistic user message into local persistent storage
    if (currentConversationId) {
      let cached = getConversationFromLocalCache(currentConversationId) || {
        id: currentConversationId,
        title: 'محادثة دراسية',
        messages: []
      };
      cached.messages = cached.messages || [];
      if (retryPromptText === null) {
        cached.messages.push({
          id: userMsgId,
          role: 'user',
          content: text,
          attachments: attachmentsToSend,
          created_at: Date.now() / 1000
        });
      }
      saveConversationToLocalCache(cached);
    }

    isGenerating = true;
    isSubmitting = false;
    actionPillBtn.classList.add('generating-mode');
    activeAbortController = new AbortController();

    // Instantiate Smooth Progressive Streamer
    activeStreamer = new SmoothTextStreamer({
      textElem,
      cursorElem,
      onDone: (finalContent) => {
        actionsElem.style.display = 'flex';
        setupMessageToolbar(actionsElem, finalContent, messageRow, assistantMsgId);
        
        // Persist completed assistant message into local persistent storage
        if (currentConversationId && finalContent) {
          let cached = getConversationFromLocalCache(currentConversationId) || {
            id: currentConversationId,
            title: 'محادثة دراسية',
            messages: []
          };
          cached.messages = cached.messages || [];
          if (!cached.messages.some(m => m.id === assistantMsgId)) {
            cached.messages.push({
              id: assistantMsgId,
              role: 'assistant',
              content: finalContent,
              attachments: [],
              created_at: Date.now() / 1000
            });
          }
          saveConversationToLocalCache(cached);
        }

        // Only refresh the sidebar title and list - NEVER wipe active chat!
        refreshConversationListOnly();

        isGenerating = false;
        activeAbortController = null;
        activeStreamer = null;
        actionPillBtn.classList.remove('generating-mode');
        scrollToBottom();
      }
    });

    try {
      const payload = {
        request_id: requestId,
        conversation_id: currentConversationId,
        message_id: userMsgId,
        assistant_message_id: assistantMsgId,
        content: text,
        attachments: attachmentsToSend,
        model: selectedModel,
        temperature: settingsState.temperature,
        study_mode: settingsState.studyMode
      };

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: activeAbortController.signal
      });

      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataContent = trimmed.substring(6).trim();

          if (dataContent === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.conversation_id && parsed.conversation_id !== currentConversationId) {
              currentConversationId = parsed.conversation_id;
              localStorage.setItem('leo_active_conv_id', currentConversationId);
              // Migrate local draft cache to new conversation ID if needed
              let cached = getConversationFromLocalCache(currentConversationId) || {
                id: currentConversationId,
                title: parsed.title || 'محادثة دراسية',
                messages: [{
                  id: userMsgId,
                  role: 'user',
                  content: text,
                  attachments: attachmentsToSend,
                  created_at: Date.now() / 1000
                }]
              };
              saveConversationToLocalCache(cached);
            }
            if (parsed.content) {
              if (parsed.replace) {
                activeStreamer.replace(parsed.content);
              } else {
                activeStreamer.append(parsed.content);
              }
            }
          } catch (e) {}
        }
      }

      activeStreamer.finish();

    } catch (err) {
      isSubmitting = false;
      if (err.name === 'AbortError') {
        isGenerating = false;
        activeAbortController = null;
        activeStreamer = null;
        actionPillBtn.classList.remove('generating-mode');
        return;
      }

      isGenerating = false;
      actionPillBtn.classList.remove('generating-mode');

      let errorMsg = 'حدث خطأ أثناء الاستجابة.';
      if (!navigator.onLine || (err.message && (err.message.toLowerCase().includes('failed to fetch') || err.message.toLowerCase().includes('network')))) {
        errorMsg = 'لا يوجد اتصال بالإنترنت أو تعذر الوصول إلى الخادم. رسالتك محفوظة.';
      } else {
        errorMsg = `تعذر استلام الرد (${err.message || 'خطأ في الاتصال'}).`;
      }

      // Keep user message intact and display real inline retry card
      textElem.innerHTML = `
        <div class="stream-error-card">
          <div class="stream-error-content">
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
            <span>${errorMsg}</span>
          </div>
          <button class="stream-retry-btn" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg><span>إعادة المحاولة</span></button>
        </div>
      `;

      const retryBtn = textElem.querySelector('.stream-retry-btn');
      if (retryBtn) {
        retryBtn.onclick = () => {
          messageRow.remove();
          handleSendPrompt(text, attachmentsToSend);
        };
      }

      if (cursorElem && cursorElem.parentNode) cursorElem.remove();
      activeAbortController = null;
      activeStreamer = null;
    }
  }

  // --- Message UI Renderers ---
  function appendUserMessage(text, attachments, msgId) {
    const row = document.createElement('div');
    row.className = 'user-message-row';
    if (msgId) row.dataset.msgId = msgId;

    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        const img = document.createElement('img');
        img.className = 'user-attached-image';
        img.src = att.data || att.url;
        img.alt = att.name || 'مرفق دراسي';
        img.title = 'اضغط لتكبير الصورة في عارض الصور';
        img.onclick = () => openImageLightbox(img.src);
        row.appendChild(img);
      });
    }

    if (text) {
      const bubble = document.createElement('div');
      bubble.className = 'user-bubble';
      bubble.textContent = text;
      row.appendChild(bubble);

      // User Message Actions Toolbar (Copy, Edit, Delete)
      const toolbar = document.createElement('div');
      toolbar.className = 'user-actions-toolbar';
      toolbar.innerHTML = `
        <button class="user-action-btn action-copy-user" title="نسخ الرسالة" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="user-action-btn action-edit-user" title="تعديل الرسالة في محرر النصوص" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="user-action-btn action-del-user" title="حذف" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;

      // Copy Action
      toolbar.querySelector('.action-copy-user').onclick = async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          showToast('تم نسخ نص الرسالة');
        } catch (err) {
          showToast('تم النسخ');
        }
      };

      // Edit Action: populate composer and delete all subsequent messages
      toolbar.querySelector('.action-edit-user').onclick = async (e) => {
        e.stopPropagation();
        chatTextInput.value = text;
        autoResizeTextarea();
        chatTextInput.focus();
        actionPillBtn.classList.add('send-mode');

        // Delete all subsequent messages in the UI
        let next = row.nextElementSibling;
        while (next) {
          const toRemove = next;
          next = next.nextElementSibling;
          toRemove.remove();
        }
        // Remove the edited row itself from UI
        row.remove();

        // Also trim backend database so reopening the chat reflects the trim
        const actualMsgId = msgId || row.dataset.msgId;
        if (actualMsgId && currentConversationId) {
          try {
            await fetch(`/api/conversations/${currentConversationId}/trim`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message_id: actualMsgId })
            });
          } catch (err) {}
          const cached = getConversationFromLocalCache(currentConversationId);
          if (cached && cached.messages) {
            const idx = cached.messages.findIndex(m => m.id === actualMsgId);
            if (idx !== -1) {
              cached.messages = cached.messages.slice(0, idx);
              saveConversationToLocalCache(cached);
            }
          }
        }

        showToast('تم فتح الرسالة للتعديل وحذف الردود اللاحقة');
      };

      // Delete Action
      toolbar.querySelector('.action-del-user').onclick = async (e) => {
        e.stopPropagation();
        const actualMsgId = msgId || row.dataset.msgId;
        if (actualMsgId) {
          try {
            await fetch(`/api/messages/${actualMsgId}`, { method: 'DELETE' });
          } catch (err) {}
        }
        if (currentConversationId) {
          const cached = getConversationFromLocalCache(currentConversationId);
          if (cached && cached.messages) {
            cached.messages = cached.messages.filter(m => m.id !== actualMsgId);
            saveConversationToLocalCache(cached);
          }
        }
        row.remove();
        showToast('تم حذف الرسالة');
      };

      row.appendChild(toolbar);

      // Mobile Long-Press Touch Handler (450ms hold)
      let touchTimer = null;
      row.addEventListener('touchstart', () => {
        touchTimer = setTimeout(() => {
          row.classList.toggle('actions-visible');
          if (navigator.vibrate) navigator.vibrate(30);
        }, 450);
      }, { passive: true });

      row.addEventListener('touchend', () => {
        if (touchTimer) clearTimeout(touchTimer);
      });
      row.addEventListener('touchmove', () => {
        if (touchTimer) clearTimeout(touchTimer);
      });
    }

    messagesStreamList.appendChild(row);
  }

  function createAssistantSlot(msgId) {
    const messageRow = document.createElement('div');
    messageRow.className = 'assistant-message-row';
    if (msgId) messageRow.dataset.msgId = msgId;

    const textElem = document.createElement('div');
    textElem.className = 'assistant-message-text';

    const cursorElem = document.createElement('span');
    cursorElem.className = 'typing-cursor';
    textElem.appendChild(cursorElem);

    const actionsElem = document.createElement('div');
    actionsElem.className = 'assistant-actions-toolbar';
    actionsElem.style.display = 'none';
    buildToolbarHtml(actionsElem);

    messageRow.appendChild(textElem);
    messageRow.appendChild(actionsElem);
    messagesStreamList.appendChild(messageRow);

    return { messageRow, textElem, actionsElem, cursorElem };
  }

  function renderStoredAssistantMessage(content, msgId) {
    const messageRow = document.createElement('div');
    messageRow.className = 'assistant-message-row';
    if (msgId) messageRow.dataset.msgId = msgId;

    const textElem = document.createElement('div');
    textElem.className = 'assistant-message-text';
    renderMarkdownFinal(textElem, content);

    const actionsElem = document.createElement('div');
    actionsElem.className = 'assistant-actions-toolbar';
    buildToolbarHtml(actionsElem);
    setupMessageToolbar(actionsElem, content, messageRow, msgId);

    messageRow.appendChild(textElem);
    messageRow.appendChild(actionsElem);
    messagesStreamList.appendChild(messageRow);
  }

  function renderMarkdownStream(elem, markdownText, cursorElem) {
    if (window.marked) {
      elem.innerHTML = marked.parse(markdownText);
    } else {
      elem.textContent = markdownText;
    }
    elem.appendChild(cursorElem);
    bindCopyCodeButtons(elem);
    elem.querySelectorAll('img').forEach(img => {
      img.classList.add('chat-rendered-image');
      img.onclick = () => openImageLightbox(img.src);
    });
  }

  function renderMarkdownFinal(elem, markdownText) {
    if (window.marked) {
      elem.innerHTML = marked.parse(markdownText);
    } else {
      elem.textContent = markdownText;
    }
    bindCopyCodeButtons(elem);
    elem.querySelectorAll('img').forEach(img => {
      img.classList.add('chat-rendered-image');
      img.onclick = () => openImageLightbox(img.src);
    });
  }

  function bindCopyCodeButtons(container) {
    container.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(btn.dataset.code);
          const orig = btn.querySelector('span').textContent;
          btn.querySelector('span').textContent = 'تم النسخ!';
          setTimeout(() => btn.querySelector('span').textContent = orig, 2000);
          showToast('تم نسخ الكود البرمجي');
        } catch (err) {
          showToast('تم النسخ');
        }
      };
    });
  }

  function buildToolbarHtml(actionsElem) {
    actionsElem.innerHTML = `
      <button class="msg-action-btn action-speak" title="استماع إلى إجابة الأستاذ ليو" aria-label="استماع">
        <svg class="speaker-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
      </button>
      <button class="msg-action-btn action-dislike" title="لم يعجبني"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg></button>
      <button class="msg-action-btn action-like" title="أعجبني"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4.33A2.31 2.31 0 0 1 2 20v-7a2.31 2.31 0 0 1 2.33-2H7"></path></svg></button>
      <button class="msg-action-btn action-retry" title="إعادة التوليد"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg></button>
      <button class="msg-action-btn action-copy" title="نسخ الرسالة"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
    `;
  }

  function setupMessageToolbar(toolbar, content, messageRow, msgId) {
    const speakBtn = toolbar.querySelector('.action-speak');
    const dislikeBtn = toolbar.querySelector('.action-dislike');
    const likeBtn = toolbar.querySelector('.action-like');
    const retryBtn = toolbar.querySelector('.action-retry');
    const copyBtn = toolbar.querySelector('.action-copy');

    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(content);
      showToast('تم نسخ نص الرسالة');
    };

    // Real Edge-TTS Speech Synthesis (voice: ar-AE-HamdanNeural)
    speakBtn.onclick = async () => {
      // 1. If currently playing this specific message, toggle stop
      if (currentActiveSpeakBtn === speakBtn) {
        stopActiveTTSAudio();
        showToast('تم إيقاف القراءة الصوتية');
        return;
      }

      // 2. Stop any other audio that might be playing
      stopActiveTTSAudio();

      // 3. Set loading state on this button
      speakBtn.classList.add('loading-audio');
      speakBtn.innerHTML = speakerLoadingSvg;
      speakBtn.title = 'جاري تحضير الصوت...';
      currentActiveSpeakBtn = speakBtn;
      isTTSPlaying = true;
      showAudioBar('الأستاذ ليو يجهز صوته للاستماع...', true);

      try {
        const resp = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content })
        });

        if (!resp.ok) {
          throw new Error('TTS server responded with ' + resp.status);
        }

        // Check if user clicked cancel or stopped while downloading
        if (currentActiveSpeakBtn !== speakBtn) {
          return;
        }

        const audioBlob = await resp.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentActiveTTSAudio = audio;

        // 4. Update button to playing state
        speakBtn.classList.remove('loading-audio');
        speakBtn.classList.add('playing-audio');
        speakBtn.innerHTML = speakerPlayingSvg;
        speakBtn.title = 'إيقاف الاستماع';
        showAudioBar('الأستاذ ليو يشرح بصوته (حمدان)...', true);

        audio.onended = () => {
          stopActiveTTSAudio();
        };

        audio.onerror = () => {
          stopActiveTTSAudio();
          showToast('حدث خطأ أثناء تشغيل الصوت');
        };

        await audio.play();

      } catch (err) {
        console.error('Edge-TTS playback error:', err);
        if (currentActiveSpeakBtn === speakBtn) {
          stopActiveTTSAudio();
        }
        showToast('تعذر توليد القراءة الصوتية، يرجى المحاولة لاحقاً');
      }
    };

    likeBtn.onclick = () => {
      likeBtn.classList.toggle('active-action');
      dislikeBtn.classList.remove('active-action');
    };

    dislikeBtn.onclick = () => {
      dislikeBtn.classList.toggle('active-action');
      likeBtn.classList.remove('active-action');
    };

    retryBtn.onclick = () => {
      const userBubbles = messagesStreamList.querySelectorAll('.user-bubble');
      if (userBubbles.length > 0) {
        chatTextInput.value = userBubbles[userBubbles.length - 1].textContent;
        autoResizeTextarea();
        actionPillBtn.classList.add('send-mode');
        handleSendPrompt();
      }
    };
  }

  function scrollToBottom() {
    chatContentArea.scrollTop = chatContentArea.scrollHeight;
  }

  // --- New Chat Handlers ---
  function createNewChat() {
    currentConversationId = null;
    localStorage.removeItem('leo_active_conv_id');
    showEmptyState();
    closeSidebar();
    chatTextInput.value = '';
    autoResizeTextarea();
    pendingAttachments = [];
    renderAttachmentChips();
    actionPillBtn.classList.remove('send-mode');
    document.querySelectorAll('.chat-history-item').forEach(i => i.classList.remove('active'));
    showToast('بدأت محادثة دراسية جديدة');
  }

  newChatBtn.addEventListener('click', createNewChat);
  drawerNewChatBtn.addEventListener('click', createNewChat);

  // --- Model Selector Dropdown ---
  modelSelectorPill.addEventListener('click', (e) => {
    e.stopPropagation();
    modelSelectorWrapper.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!modelSelectorWrapper.contains(e.target)) {
      modelSelectorWrapper.classList.remove('active');
    }
  });

  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      selectedModel = item.dataset.model;
      localStorage.setItem('leo_selected_model', selectedModel);

      const title = item.querySelector('.item-title').textContent;
      currentModelLabel.textContent = title;
      modelSelectorWrapper.classList.remove('active');
      showToast(`تم تفعيل النموذج: ${title}`);
    });
  });

  // --- Sidebar Controls ---
  function openSidebar() {
    sidebarDrawer.classList.add('active');
    sidebarBackdrop.classList.add('active');
  }

  function closeSidebar() {
    sidebarDrawer.classList.remove('active');
    sidebarBackdrop.classList.remove('active');
    drawerSearchBox.style.display = 'none';
  }

  sidebarToggleBtn.addEventListener('click', openSidebar);
  drawerCloseBtn.addEventListener('click', closeSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);

  searchChatsBtn.addEventListener('click', () => {
    drawerSearchBox.style.display = drawerSearchBox.style.display === 'none' ? 'block' : 'none';
    if (drawerSearchBox.style.display === 'block') drawerSearchInput.focus();
  });

  drawerSearchInput.addEventListener('input', () => {
    const query = drawerSearchInput.value.trim().toLowerCase();
    document.querySelectorAll('.chat-history-item').forEach(item => {
      const title = item.querySelector('.chat-title').textContent.toLowerCase();
      item.style.display = (!query || title.includes(query)) ? 'flex' : 'none';
    });
  });

  // --- Student Profile Logic (Iraqi Educational Curriculum) ---
  function populateGradeSelect(stageKey, selectedGrade = null) {
    const stage = IRAQI_STAGES_DATA[stageKey] || IRAQI_STAGES_DATA.preparatory;
    profGradeSubSelect.innerHTML = '';
    stage.grades.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.label;
      if (selectedGrade && selectedGrade === g.id) opt.selected = true;
      profGradeSubSelect.appendChild(opt);
    });

    if (stageKey === 'university') {
      profSpecializationWrapper.style.display = 'flex';
    } else {
      profSpecializationWrapper.style.display = 'none';
    }
  }

  profStageSelect.addEventListener('change', () => {
    populateGradeSelect(profStageSelect.value);
  });

  // --- ChatGPT-Style Full-Screen Auth & Onboarding Flow ---
  let authMode = 'login'; // 'login' or 'signup'

  if (authTabLogin) {
    authTabLogin.onclick = () => {
      authMode = 'login';
      authTabLogin.classList.add('active');
      authTabSignup.classList.remove('active');
      authEmailSubmitText.textContent = 'المتابعة والدخول';
    };
  }

  if (authTabSignup) {
    authTabSignup.onclick = () => {
      authMode = 'signup';
      authTabSignup.classList.add('active');
      authTabLogin.classList.remove('active');
      authEmailSubmitText.textContent = 'إنشاء حساب ومتابعة';
    };
  }

  function goToAuthStep(stepNum) {
    if (stepNum === 1) {
      authStep1.classList.add('active');
      authStep2.classList.remove('active');
    } else {
      authStep1.classList.remove('active');
      authStep2.classList.add('active');
      setTimeout(() => profNameInput && profNameInput.focus(), 150);
    }
  }

  function openProfileModal(isMandatory = false, startAtStep = null) {
    const profNameError = document.getElementById('profNameError');
    if (profNameError) profNameError.style.display = 'none';
    if (profNameInput) profNameInput.classList.remove('input-error');

    const isUnregistered = (!studentProfile || !studentProfile.name || studentProfile.name.trim() === 'الطالب');
    const effectiveStep = (startAtStep !== null) ? startAtStep : (isUnregistered ? 1 : 2);

    if (isMandatory || isUnregistered) {
      if (authFullscreenCloseBtn) authFullscreenCloseBtn.style.display = 'none';
    } else {
      if (authFullscreenCloseBtn) authFullscreenCloseBtn.style.display = 'flex';
    }

    const stepTitle = document.querySelector('#authStep2 .auth-header-title');
    const stepSubtitle = document.querySelector('#authStep2 .auth-header-subtitle');
    const stepBadge = document.querySelector('#authStep2 .auth-badge-pill');
    const stepSaveBtn = document.getElementById('saveProfileBtn');

    if (!isUnregistered && effectiveStep === 2) {
      if (stepTitle) stepTitle.textContent = 'تعديل الملف الدراسي والشخصي';
      if (stepSubtitle) stepSubtitle.textContent = 'حدّث اسمك أو مرحلتك وصفك الدراسي ونمط الشرح في أي وقت';
      if (stepBadge) stepBadge.textContent = 'تعديل البيانات';
      if (stepSaveBtn) stepSaveBtn.innerHTML = '<span>حفظ التعديلات الأكاديمية</span>';
    }

    if (!isUnregistered) {
      profNameInput.value = studentProfile.name;
      const genderRadios = document.querySelectorAll('input[name="profGender"]');
      genderRadios.forEach(r => r.checked = (r.value === studentProfile.gender));
      
      profStageSelect.value = studentProfile.stage || 'preparatory';
      populateGradeSelect(profStageSelect.value, studentProfile.grade_sub);
      if (profSpecializationInput) profSpecializationInput.value = studentProfile.specialization || '';
      if (profStudyModeSelect && studentProfile.studyMode) profStudyModeSelect.value = studentProfile.studyMode;
      goToAuthStep(effectiveStep);
    } else {
      profNameInput.value = '';
      const defaultMaleRadio = document.querySelector('input[name="profGender"][value="male"]');
      if (defaultMaleRadio) defaultMaleRadio.checked = true;
      profStageSelect.value = 'preparatory';
      populateGradeSelect('preparatory', 'sixth_scientific');
      if (profSpecializationInput) profSpecializationInput.value = '';
      goToAuthStep(effectiveStep);
    }

    if (authFullscreenScreen) authFullscreenScreen.classList.add('active');
  }

  function closeProfileModal() {
    if (!studentProfile || !studentProfile.name || studentProfile.name.trim() === 'الطالب') {
      showToast('يرجى إكمال بياناتك الدراسية للبدء مع الأستاذ ليو');
      return;
    }
    if (authFullscreenScreen) authFullscreenScreen.classList.remove('active');
  }

  if (authFullscreenCloseBtn) authFullscreenCloseBtn.addEventListener('click', closeProfileModal);

  // 1. Google Sign-In Handler
  if (authGoogleBtn) {
    authGoogleBtn.onclick = async () => {
      if (!window.LeoFirebase || typeof window.LeoFirebase.signInWithGoogle !== 'function') {
        showToast('جاري تحضير خدمة تسجيل الدخول، يرجى المحاولة بعد لحظات');
        return;
      }
      try {
        showToast('جاري تسجيل الدخول عبر Google...');
        const user = await window.LeoFirebase.signInWithGoogle();
        
        // Check if user already has an existing academic profile in cloud
        const cloudProf = await window.LeoFirebase.getProfile();
        if (cloudProf && cloudProf.name && cloudProf.name.trim() && cloudProf.name.trim() !== 'الطالب') {
          studentProfile = cloudProf;
          localStorage.setItem('leo_student_profile', JSON.stringify(cloudProf));
          updateProfileUI();
          closeProfileModal();
          showToast(`تم تسجيل دخولك بنجاح! مرحباً بك يا ${cloudProf.name}`);
          showEmptyState();
        } else {
          // New Google account without profile: pre-fill name and advance to Step 2!
          if (user && user.displayName) {
            profNameInput.value = user.displayName;
          }
          goToAuthStep(2);
          showToast('تم التحقق من حسابك! يرجى اختيار صفك ومنهجك الدراسي للمتابعة');
        }
      } catch (err) {
        console.warn('Google Sign-in notice:', err);
        if (err.code === 'auth/popup-closed-by-user') {
          showToast('تم إلغاء نافذة تسجيل الدخول');
        } else if (err.code === 'auth/operation-not-allowed') {
          showToast('تسجيل Google بانتظار التفعيل في إعدادات المنصة. يمكنك المتابعة بالبريد أو كطالب ضيف فوراً');
        } else {
          showToast('تعذر تسجيل الدخول عبر Google، يمكنك المتابعة بالبريد أو كطالب ضيف');
        }
      }
    };
  }

  // 2. Email / Password Submit Handler
  if (authEmailSubmitBtn) {
    authEmailSubmitBtn.onclick = async () => {
      const email = authEmailInput ? authEmailInput.value.trim() : '';
      const password = authPasswordInput ? authPasswordInput.value.trim() : '';

      if (!email || !email.includes('@')) {
        showToast('يرجى إدخال بريد إلكتروني صحيح');
        if (authEmailInput) authEmailInput.focus();
        return;
      }
      if (!password || password.length < 6) {
        showToast('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
        if (authPasswordInput) authPasswordInput.focus();
        return;
      }

      if (!window.LeoFirebase) {
        goToAuthStep(2);
        return;
      }

      try {
        if (authMode === 'login') {
          showToast('جاري التحقق من بيانات الحساب...');
          await window.LeoFirebase.signIn(email, password);
          const cloudProf = await window.LeoFirebase.getProfile();
          if (cloudProf && cloudProf.name && cloudProf.name.trim() !== 'الطالب') {
            studentProfile = cloudProf;
            localStorage.setItem('leo_student_profile', JSON.stringify(cloudProf));
            updateProfileUI();
            closeProfileModal();
            showToast(`تم تسجيل دخولك بنجاح! مرحباً بك يا ${cloudProf.name}`);
            showEmptyState();
          } else {
            goToAuthStep(2);
          }
        } else {
          showToast('جاري إنشاء الحساب الجديد...');
          await window.LeoFirebase.signUp(email, password, { email });
          showToast('تم إنشاء الحساب بنجاح! خطوتك الأخيرة لاختيار مرحلتك');
          goToAuthStep(2);
        }
      } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          showToast('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        } else if (err.code === 'auth/email-already-in-use') {
          showToast('هذا البريد مسجل مسبقاً، يمكنك تسجيل الدخول به');
          authTabLogin.click();
        } else {
          showToast('حدث خطأ في المصادقة، يمكنك المتابعة كطالب ضيف');
        }
      }
    };
  }

  // 3. Guest Fast Bypass Handler
  if (authGuestBypassBtn) {
    authGuestBypassBtn.onclick = async () => {
      if (window.LeoFirebase) {
        await window.LeoFirebase.ensureAuthenticated(deviceUserId).catch(() => {});
      }
      goToAuthStep(2);
    };
  }

  // 4. Step 2 Save Academic Profile Handler
  saveProfileBtn.addEventListener('click', async () => {
    const name = profNameInput.value.trim();
    const profNameError = document.getElementById('profNameError');

    if (!name || name === 'الطالب') {
      if (profNameError) profNameError.style.display = 'block';
      profNameInput.classList.add('input-error');
      profNameInput.focus();
      showToast('يرجى كتابة اسمك الحقيقي لتخصيص الشرح الدراسي بدقة');
      return;
    }

    if (profNameError) profNameError.style.display = 'none';
    profNameInput.classList.remove('input-error');

    const genderRadio = document.querySelector('input[name="profGender"]:checked');
    const gender = genderRadio ? genderRadio.value : 'male';
    const stage = profStageSelect.value;
    const grade_sub = profGradeSubSelect.value;
    const specialization = profSpecializationInput ? profSpecializationInput.value.trim() : '';
    const studyMode = profStudyModeSelect ? profStudyModeSelect.value : 'standard';

    const email = authEmailInput ? authEmailInput.value.trim() : '';

    studentProfile = { name, gender, stage, grade_sub, specialization, studyMode, email };
    settingsState.studyMode = studyMode;

    try {
      localStorage.setItem('leo_student_profile', JSON.stringify(studentProfile));
    } catch (e) {}

    // Save to Firebase Cloud Storage (silently without exposing technical details)
    if (window.LeoFirebase) {
      try {
        await window.LeoFirebase.ensureAuthenticated(deviceUserId, name);
        await window.LeoFirebase.saveProfile(studentProfile);
      } catch (fbErr) {
        console.warn('Profile save notice:', fbErr);
      }
    }

    // Sync to local server
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentProfile)
    }).catch(() => {});

    saveSettingsToServer();

    if (authFullscreenCloseBtn) authFullscreenCloseBtn.style.display = 'flex';
    updateProfileUI();
    if (authFullscreenScreen) authFullscreenScreen.classList.remove('active');
    showToast(`تم تسجيل دخولك بنجاح! مرحباً بك يا ${name}`);
    showEmptyState();
  });

  // --- Keyboard Shortcut 'T' to Toggle Dark / Light Theme ---
  function toggleThemeShortcut() {
    const isCurrentlyLight = document.body.classList.contains('theme-light') || settingsState.appearance === 'light';
    const nextTheme = isCurrentlyLight ? 'dark' : 'light';
    applyAppearance(nextTheme);
    saveSettingsToServer();
    showToast(nextTheme === 'dark' ? 'تم تفعيل الوضع الداكن (اختصار T)' : 'تم تفعيل الوضع الفاتح (اختصار T)');
  }

  document.addEventListener('keydown', (e) => {
    const targetTag = (e.target.tagName || '').toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || e.target.isContentEditable) {
      return;
    }
    if (e.key === 't' || e.key === 'T' || e.code === 'KeyT') {
      e.preventDefault();
      toggleThemeShortcut();
    }
  });

  function updateProfileUI() {
    if (!studentProfile || !studentProfile.name || studentProfile.name.trim() === 'الطالب') {
      settingsUsernameText.textContent = 'تسجيل الدخول';
      drawerProfileName.textContent = 'تسجيل الدخول';
      drawerAvatarLetter.textContent = '؟';
      settingsAvatarLetterLarge.textContent = '؟';
      drawerProfileStageBadge.textContent = 'اضغط للبدء';
      settingsStudentStagePill.textContent = 'غير مسجل';
      emptyStudentGreeting.textContent = 'أهلاً بك! يرجى تسجيل الدخول للبدء مع الأستاذ ليو المستشار الأكاديمي.';
      return;
    }

    const name = studentProfile.name.trim();
    settingsUsernameText.textContent = name;
    drawerProfileName.textContent = name;
    
    const letter = name.charAt(0);
    drawerAvatarLetter.textContent = letter;
    settingsAvatarLetterLarge.textContent = letter;

    const stg = IRAQI_STAGES_DATA[studentProfile.stage] || IRAQI_STAGES_DATA.preparatory;
    const grd = stg.grades.find(g => g.id === studentProfile.grade_sub) || stg.grades[0];
    const stageLabel = `${stg.name} — ${grd ? grd.label : ''}`;

    drawerProfileStageBadge.textContent = grd ? grd.label : stg.name;
    settingsStudentStagePill.textContent = stageLabel;

    const genderWord = studentProfile.gender === 'female' ? '' : '';
    emptyStudentGreeting.textContent = `مرحباً ${name}! الأستاذ ليو مستعد لمدارسة كافة مواضيعك في ${grd ? grd.label : stg.name}.`;
  }

  // Profile click handlers
  drawerProfileCard.onclick = () => {
    closeSidebar();
    if (!studentProfile || !studentProfile.name || studentProfile.name.trim() === 'الطالب') {
      openProfileModal(true);
    } else {
      settingsScreen.classList.add('active');
    }
  };

  settingsBackBtn.onclick = () => settingsScreen.classList.remove('active');
  studentProfileRow.onclick = () => openProfileModal(false, 2);
  settingsNamePill.onclick = () => openProfileModal(false, 2);
  avatarEditBadgeBtn.onclick = () => openProfileModal(false, 2);

  // Customization Row Modal
  customizationRow.onclick = () => {
    modalTitle.textContent = 'تخصيص نمط التدريس للأستاذ ليو';
    modalBody.innerHTML = `
      <div class="modal-field">
        <label>نمط الشرح المفضل:</label>
        <select id="modalStudyMode">
          <option value="standard" ${settingsState.studyMode === 'standard' ? 'selected' : ''}>شرح دراسي متسلسل ومنهجي خطوة بخطوة</option>
          <option value="math" ${settingsState.studyMode === 'math' ? 'selected' : ''}>حل مسائل وتمارين مع القوانين والتعويض (علمي/رياضي)</option>
          <option value="exam" ${settingsState.studyMode === 'exam' ? 'selected' : ''}>مراجعة امتحانية وأسئلة وزارية مع الحل النموذجي</option>
          <option value="summary" ${settingsState.studyMode === 'summary' ? 'selected' : ''}>تلخيص ذكي وجداول مقارنة للمراجعة السريعة</option>
        </select>
      </div>
      <div class="modal-field">
        <label>درجة التفصيل والدقة العلمية (Temperature: <span id="tempValDisplay">${settingsState.temperature}</span>):</label>
        <input type="range" id="modalTempRange" min="0.2" max="1.0" step="0.1" value="${settingsState.temperature}">
      </div>
      <button class="modal-primary-btn" id="modalSaveCustomBtn">حفظ النمط التعليمي</button>
    `;

    const tempRange = document.getElementById('modalTempRange');
    const tempDisplay = document.getElementById('tempValDisplay');
    tempRange.oninput = () => tempDisplay.textContent = tempRange.value;

    document.getElementById('modalSaveCustomBtn').onclick = () => {
      settingsState.studyMode = document.getElementById('modalStudyMode').value;
      settingsState.temperature = parseFloat(tempRange.value);
      saveSettingsToServer();
      closeModal();
      showToast('تم حفظ نمط الشرح التعليمي');
    };

    openModal();
  };

  // --- Appearance Engine (Dark, Light, System) ---
  const appearanceModes = [
    { id: 'dark', label: 'داكن (Dark)' },
    { id: 'light', label: 'فاتح (Light)' },
    { id: 'system', label: 'تلقائي حسب النظام (System)' }
  ];

  function applyAppearance(mode) {
    settingsState.appearance = mode;
    const modeObj = appearanceModes.find(m => m.id === mode) || appearanceModes[0];
    if (currentAppearanceLabel) currentAppearanceLabel.textContent = modeObj.label;

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (mode === 'light' || (mode === 'system' && !prefersDark)) {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }

  // OS theme change listener
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (settingsState.appearance === 'system') {
        applyAppearance('system');
      }
    });
  }

  // Appearance Row Click Handler (Cycles Dark -> Light -> System)
  if (appearanceRow) {
    appearanceRow.onclick = () => {
      const currIdx = appearanceModes.findIndex(m => m.id === settingsState.appearance);
      const nextMode = appearanceModes[(currIdx + 1) % appearanceModes.length];
      applyAppearance(nextMode.id);
      saveSettingsToServer();
      showToast(`تم تفعيل المظهر: ${nextMode.label}`);
    };
  }

  // Bubble Theme Row
  if (bubbleThemeRow) {
    bubbleThemeRow.onclick = () => {
      const idx = bubbleThemes.findIndex(t => t.id === settingsState.bubbleTheme);
      const nextIdx = (idx + 1) % bubbleThemes.length;
      const nextTheme = bubbleThemes[nextIdx];

      bubbleThemes.forEach(t => document.body.classList.remove(t.id));
      document.body.classList.add(nextTheme.id);

      settingsState.bubbleTheme = nextTheme.id;
      currentBubbleThemeLabel.textContent = nextTheme.name;
      document.getElementById('glowingOrbPreview').style.background = nextTheme.preview;
      saveSettingsToServer();
      showToast(`تم تغيير مظهر التوهج: ${nextTheme.name}`);
    };
  }

  // --- Real Long-Term Memory Management ---
  async function refreshMemoriesUI() {
    try {
      const res = await fetch('/api/memories');
      if (!res.ok) return [];
      const data = await res.json();
      const memories = data.memories || [];
      if (memoryCountSubtitle) {
        memoryCountSubtitle.textContent = memories.length > 0 ? `${memories.length} تفضيلات محفوظة` : 'لا توجد تفضيلات بعد';
      }
      return memories;
    } catch (e) {
      return [];
    }
  }

  async function renderMemoriesModalList() {
    if (!memoryItemsList) return;
    memoryItemsList.innerHTML = '<div class="memory-empty-state">جاري تحميل التفضيلات...</div>';
    const memories = await refreshMemoriesUI();

    if (!memories || memories.length === 0) {
      memoryItemsList.innerHTML = '<div class="memory-empty-state">لا توجد تفضيلات محفوظة بعد. سيتذكر الأستاذ ليو تفضيلاتك تلقائياً أو يمكنك إضافتها يدوياً أعلاه.</div>';
      return;
    }

    memoryItemsList.innerHTML = '';
    memories.forEach(mem => {
      const card = document.createElement('div');
      card.className = 'memory-item-card';
      const dateStr = mem.created_at ? new Date(mem.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : '';
      card.innerHTML = `
        <div class="memory-item-info">
          <span class="memory-item-text">${mem.content}</span>
          <span class="memory-item-date">${dateStr ? 'حُفظ في: ' + dateStr : ''}</span>
        </div>
        <button class="memory-item-del-btn" title="حذف هذا التفضيل" type="button"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      `;
      card.querySelector('.memory-item-del-btn').onclick = async (e) => {
        e.stopPropagation();
        await fetch(`/api/memories/${mem.id}`, { method: 'DELETE' });
        showToast('تم حذف التفضيل بنجاح');
        renderMemoriesModalList();
      };
      memoryItemsList.appendChild(card);
    });
  }

  function openMemoryModal() {
    if (!memoryModalOverlay) return;
    memoryModalOverlay.classList.add('active');
    renderMemoriesModalList();
  }

  function closeMemoryModal() {
    if (!memoryModalOverlay) return;
    memoryModalOverlay.classList.remove('active');
  }

  if (longTermMemoryRow) longTermMemoryRow.onclick = openMemoryModal;
  if (memoryModalCloseBtn) memoryModalCloseBtn.onclick = closeMemoryModal;
  if (memoryModalOverlay) {
    memoryModalOverlay.onclick = (e) => {
      if (e.target === memoryModalOverlay) closeMemoryModal();
    };
  }

  if (addManualMemoryBtn) {
    addManualMemoryBtn.onclick = async () => {
      const text = manualMemoryInput.value.trim();
      if (!text) return;
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, category: 'preference' })
      });
      manualMemoryInput.value = '';
      showToast('تم حفظ التفضيل في ذاكرة ليو');
      renderMemoriesModalList();
    };
  }

  if (clearAllMemoriesBtn) {
    clearAllMemoriesBtn.onclick = () => {
      showCustomConfirm({
        title: 'مسح الذكريات المحفوظة',
        message: 'هل أنت متأكد من مسح جميع التفضيلات والذكريات المحفوظة نهائياً؟',
        okText: 'مسح الكل',
        danger: true,
        onConfirm: async () => {
          await fetch('/api/memories/clear', { method: 'POST' });
          showToast('تم مسح جميع التفضيلات المحفوظة');
          renderMemoriesModalList();
        }
      });
    };
  }

  // Clear Chat History Row
  if (clearChatHistoryRow) {
    clearChatHistoryRow.onclick = () => {
      showCustomConfirm({
        title: 'مسح سجل المحادثات',
        message: 'هل أنت متأكد من مسح سجل جميع المحادثات السابقة نهائياً؟',
        okText: 'مسح السجل',
        danger: true,
        onConfirm: async () => {
          await fetch('/api/conversations/clear', { method: 'POST' });
          currentConversationId = null;
          localStorage.removeItem('leo_active_conv_id');
          showEmptyState();
          loadConversationHistory();
          showToast('تم مسح سجل المحادثات بنجاح');
        }
      });
    };
  }

  // --- Real Image Lightbox Viewer Controls ---
  let currentZoom = 1.0;

  function updateLightboxZoom(newZoom) {
    currentZoom = Math.min(Math.max(newZoom, 0.5), 3.0);
    if (lightboxImg) lightboxImg.style.transform = `scale(${currentZoom})`;
    if (lightboxZoomLevel) lightboxZoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  function openImageLightbox(src) {
    if (!imageLightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    updateLightboxZoom(1.0);
    imageLightboxModal.style.display = 'flex';
  }
  window.openStudioLightbox = openImageLightbox;

  // --- Real-time ChatGPT DALL-E Progress Percentage Simulation ---
  let activeDalleTimer = null;
  function animateDalleProgress(container) {
    if (activeDalleTimer) clearInterval(activeDalleTimer);
    const pill = container ? container.querySelector('.dalle-progress-pill') : document.querySelector('.dalle-progress-pill');
    if (!pill) return;
    let currentPct = 12;
    pill.textContent = `${currentPct}%`;
    activeDalleTimer = setInterval(() => {
      if (!pill.isConnected) {
        clearInterval(activeDalleTimer);
        activeDalleTimer = null;
        return;
      }
      if (currentPct < 94) {
        const increment = Math.floor(Math.random() * 6) + 3;
        currentPct = Math.min(currentPct + increment, 96);
        pill.textContent = `${currentPct}%`;
      }
    }, 450);
  }

  function stopDalleProgress() {
    if (activeDalleTimer) {
      clearInterval(activeDalleTimer);
      activeDalleTimer = null;
    }
  }

  // --- ChatGPT DALL-E Image Actions ---
  window.downloadImageDirect = (url, filename = 'generated_image.png') => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('جاري تحميل الصورة');
  };

  window.copyImageLinkDirect = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast('تم نسخ رابط الصورة');
    } catch (e) {
      showToast('تم النسخ');
    }
  };

  window.rateGeneratedImage = (btn, type) => {
    if (!btn) return;
    const row = btn.closest('.dalle-actions-row');
    if (row) {
      row.querySelectorAll('.dalle-act-icon-btn').forEach(b => b.classList.remove('active-action'));
    }
    btn.classList.add('active-action');
    showToast(type === 'like' ? 'شكراً لتقييمك الإيجابي' : 'تم استلام ملاحظتك');
  };

  window.shareGeneratedImage = async (url, prompt = '') => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: prompt || 'صورة مولدة بالذكاء الاصطناعي',
          text: prompt,
          url: url
        });
        return;
      } catch (e) {}
    }
    window.copyImageLinkDirect(url);
  };

  window.openImageMoreMenu = (btn, url) => {
    if (!url) return;
    openImageLightbox(url);
  };

  function closeImageLightbox() {
    if (!imageLightboxModal) return;
    imageLightboxModal.style.display = 'none';
    if (lightboxImg) lightboxImg.src = '';
  }

  if (lightboxZoomInBtn) lightboxZoomInBtn.onclick = () => updateLightboxZoom(currentZoom + 0.25);
  if (lightboxZoomOutBtn) lightboxZoomOutBtn.onclick = () => updateLightboxZoom(currentZoom - 0.25);
  if (lightboxResetBtn) lightboxResetBtn.onclick = () => updateLightboxZoom(1.0);
  if (lightboxCloseBtn) lightboxCloseBtn.onclick = closeImageLightbox;
  if (lightboxBackdrop) lightboxBackdrop.onclick = closeImageLightbox;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (imageLightboxModal && imageLightboxModal.style.display === 'flex') {
        closeImageLightbox();
      }
      if (imageStudioModalOverlay && imageStudioModalOverlay.classList.contains('active')) {
        closeImageStudio();
      }
    }
  });

  // ============================================================
  // AI IMAGE STUDIO CONTROLLER (GPT IMAGE 2 / BANANA / REMBG)
  // ============================================================
  const imageStudioBtn = document.getElementById('imageStudioBtn');
  const sheetGenerateImgBtn = document.getElementById('sheetGenerateImgBtn');
  const drawerImageStudioBtn = document.getElementById('drawerImageStudioBtn');
  const imageStudioModalOverlay = document.getElementById('imageStudioModalOverlay');
  const imageStudioCloseBtn = document.getElementById('imageStudioCloseBtn');
  const studioModelSelector = document.getElementById('studioModelSelector');
  const studioRatioSelector = document.getElementById('studioRatioSelector');
  const studioPromptInput = document.getElementById('studioPromptInput');
  const studioSuggestionsTags = document.getElementById('studioSuggestionsTags');
  const studioUploadBox = document.getElementById('studioUploadBox');
  const studioFileInput = document.getElementById('studioFileInput');
  const studioUploadTrigger = document.getElementById('studioUploadTrigger');
  const studioUploadLabel = document.getElementById('studioUploadLabel');
  const studioGenerateBtn = document.getElementById('studioGenerateBtn');
  const studioGenerateBtnText = document.getElementById('studioGenerateBtnText');
  const studioResultContainer = document.getElementById('studioResultContainer');
  const studioLoadingState = document.getElementById('studioLoadingState');
  const studioPreviewCard = document.getElementById('studioPreviewCard');
  const studioPreviewImg = document.getElementById('studioPreviewImg');
  const studioActionZoomBtn = document.getElementById('studioActionZoomBtn');
  const studioActionDownloadBtn = document.getElementById('studioActionDownloadBtn');
  const studioActionInsertBtn = document.getElementById('studioActionInsertBtn');
  const studioActionCopyBtn = document.getElementById('studioActionCopyBtn');

  let currentStudioModel = 'gpt-image-2';
  let currentStudioRatio = 'square_hd';
  let currentStudioUploadedUrl = null;
  let currentGeneratedImageUrl = null;

  function openImageStudio(initialPrompt = '', initialUrl = null) {
    if (!imageStudioModalOverlay) return;
    if (initialPrompt && studioPromptInput) {
      studioPromptInput.value = initialPrompt;
    }
    if (initialUrl) {
      currentStudioUploadedUrl = initialUrl;
      currentGeneratedImageUrl = initialUrl;
      if (studioPreviewImg) studioPreviewImg.src = initialUrl;
      if (studioResultContainer) studioResultContainer.style.display = 'block';
      if (studioPreviewCard) studioPreviewCard.style.display = 'flex';
      if (studioLoadingState) studioLoadingState.style.display = 'none';
    }
    imageStudioModalOverlay.classList.add('active');
    setTimeout(() => {
      if (studioPromptInput) studioPromptInput.focus();
    }, 120);
  }
  window.openImageStudio = openImageStudio;

  function closeImageStudio() {
    if (!imageStudioModalOverlay) return;
    imageStudioModalOverlay.classList.remove('active');
  }

  if (imageStudioBtn) imageStudioBtn.onclick = () => openImageStudio();
  if (sheetGenerateImgBtn) {
    sheetGenerateImgBtn.onclick = () => {
      closeAttachmentActionSheet();
      openImageStudio();
    };
  }
  if (drawerImageStudioBtn) {
    drawerImageStudioBtn.onclick = () => {
      closeSidebarDrawer();
      openImageStudio();
    };
  }
  if (imageStudioCloseBtn) imageStudioCloseBtn.onclick = closeImageStudio;
  if (imageStudioModalOverlay) {
    imageStudioModalOverlay.onclick = (e) => {
      if (e.target === imageStudioModalOverlay) closeImageStudio();
    };
  }

  // Model Selection
  if (studioModelSelector) {
    studioModelSelector.querySelectorAll('.studio-segment-btn').forEach(btn => {
      btn.onclick = () => {
        studioModelSelector.querySelectorAll('.studio-segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStudioModel = btn.dataset.model || 'gpt-image-2';

        const genSubtitle = document.getElementById('studioGenSubtitle');
        if (genSubtitle) {
          if (currentStudioModel === 'nano-banana') {
            genSubtitle.textContent = 'يتم الرسم عبر Nano Banana فائق السرعة';
          } else if (currentStudioModel === 'gpt-image-2') {
            genSubtitle.textContent = 'يتم الرسم عبر GPT Image 2 بأعلى جودة';
          } else if (currentStudioModel === 'rembg') {
            genSubtitle.textContent = 'يتم عزل الخلفية بدقة عالية';
          }
        }

        if (currentStudioModel === 'rembg') {
          if (studioUploadBox) studioUploadBox.style.display = 'block';
          if (studioPromptInput) studioPromptInput.placeholder = 'إزالة الخلفية تلقائياً (يمكنك ترك هذا الحقل فارغاً)...';
        } else {
          if (studioUploadBox) studioUploadBox.style.display = 'none';
          if (studioPromptInput) studioPromptInput.placeholder = 'صف الصورة التي ترغب في إنشائها بالتفصيل...';
        }
      };
    });
  }

  // Ratio Selection
  if (studioRatioSelector) {
    studioRatioSelector.querySelectorAll('.studio-ratio-btn').forEach(btn => {
      btn.onclick = () => {
        studioRatioSelector.querySelectorAll('.studio-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStudioRatio = btn.dataset.ratio || 'square_hd';
      };
    });
  }

  // Inspiration tags
  if (studioSuggestionsTags) {
    studioSuggestionsTags.querySelectorAll('.studio-tag-pill').forEach(btn => {
      btn.onclick = () => {
        const p = btn.dataset.prompt;
        if (p && studioPromptInput) {
          studioPromptInput.value = p;
          studioPromptInput.focus();
        }
      };
    });
  }

  // Upload Trigger for Rembg
  if (studioUploadTrigger && studioFileInput) {
    studioUploadTrigger.onclick = () => studioFileInput.click();
    studioFileInput.onchange = async () => {
      const file = studioFileInput.files && studioFileInput.files[0];
      if (!file) return;
      if (studioUploadLabel) studioUploadLabel.textContent = `جاري رفع: ${file.name}...`;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/image/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_data: reader.result })
          });
          const data = await res.json();
          if (data && data.url) {
            currentStudioUploadedUrl = data.url;
            if (studioUploadLabel) studioUploadLabel.textContent = `تم رفع الصورة: ${file.name}`;
            showToast('تم رفع الصورة بنجاح');
          } else {
            throw new Error(data.error || 'فشل الرفع');
          }
        } catch (err) {
          if (studioUploadLabel) studioUploadLabel.textContent = 'تعذر رفع الصورة، أعد المحاولة';
          showToast('فشل رفع الصورة');
        }
      };
      reader.readAsDataURL(file);
    };
  }

  // Generate Action
  if (studioGenerateBtn) {
    studioGenerateBtn.onclick = async () => {
      const prompt = studioPromptInput ? studioPromptInput.value.trim() : '';
      if (!prompt && currentStudioModel !== 'rembg') {
        showToast('يرجى كتابة وصف للصورة أولاً');
        if (studioPromptInput) studioPromptInput.focus();
        return;
      }
      if (currentStudioModel === 'rembg' && !currentStudioUploadedUrl) {
        showToast('يرجى اختيار صورة أولاً لإزالة خلفيتها');
        return;
      }

      studioGenerateBtn.disabled = true;
      if (studioGenerateBtnText) studioGenerateBtnText.textContent = 'جاري التوليد...';
      if (studioResultContainer) studioResultContainer.style.display = 'block';
      if (studioLoadingState) studioLoadingState.style.display = 'flex';
      if (studioPreviewCard) studioPreviewCard.style.display = 'none';

      try {
        const payload = {
          prompt: prompt,
          model: currentStudioModel,
          aspect_ratio: currentStudioRatio,
          image_url: currentStudioUploadedUrl
        };

        const res = await fetch('/api/image/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data && data.url) {
          currentGeneratedImageUrl = data.url;
          if (studioPreviewImg) studioPreviewImg.src = data.url;
          if (studioLoadingState) studioLoadingState.style.display = 'none';
          if (studioPreviewCard) studioPreviewCard.style.display = 'flex';
          showToast('تم تصميم وتوليد الصورة بنجاح!');
        } else {
          throw new Error(data.error || 'فشل توليد الصورة');
        }
      } catch (err) {
        if (studioLoadingState) studioLoadingState.style.display = 'none';
        showToast(err.message || 'حدث خطأ أثناء التوليد');
      } finally {
        studioGenerateBtn.disabled = false;
        if (studioGenerateBtnText) studioGenerateBtnText.textContent = 'إنشاء وتصميم الصورة';
      }
    };
  }

  // Result Preview Actions
  if (studioActionZoomBtn) {
    studioActionZoomBtn.onclick = () => {
      if (currentGeneratedImageUrl) {
        openImageLightbox(currentGeneratedImageUrl);
      }
    };
  }

  if (studioActionDownloadBtn) {
    studioActionDownloadBtn.onclick = () => {
      if (!currentGeneratedImageUrl) return;
      const a = document.createElement('a');
      a.href = currentGeneratedImageUrl;
      a.target = '_blank';
      a.download = `leo_generated_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('جاري بدء التحميل');
    };
  }

  if (studioActionCopyBtn) {
    studioActionCopyBtn.onclick = async () => {
      if (!currentGeneratedImageUrl) return;
      try {
        await navigator.clipboard.writeText(currentGeneratedImageUrl);
        showToast('تم نسخ رابط الصورة');
      } catch (e) {
        showToast('تم النسخ');
      }
    };
  }

  if (studioActionInsertBtn) {
    studioActionInsertBtn.onclick = () => {
      if (!currentGeneratedImageUrl) return;
      const promptText = studioPromptInput ? studioPromptInput.value.trim() : 'صورة مولدة بالذكاء الاصطناعي';
      const modelTitle = currentStudioModel === 'nano-banana' ? 'Nano Banana' : currentStudioModel === 'gpt-image-2' ? 'GPT Image 2' : 'إزالة الخلفية';
      const markdownMsg = `![${promptText}](${currentGeneratedImageUrl})\n\n**تم إنشاء وتصميم الصورة بالذكاء الاصطناعي.**\n- **الموضوع:** ${promptText}\n- **المحرك:** ${modelTitle}`;

      closeImageStudio();

      // Ensure active conversation
      if (!currentConversationId) {
        const newConv = createNewConversationLocally('تصميم صورة');
        currentConversationId = newConv.id;
        setActiveConversation(newConv.id);
      }

      // Add to conversation
      appendAssistantMessage(markdownMsg);
      saveCurrentConversationMessages();
      showToast('تم إدراج الصورة في المحادثة');
    };
  }

  // Report Bug Row
  reportBugRow.onclick = () => {
    modalTitle.textContent = 'الإبلاغ عن مسألة أو اقتراح دراسي';
    modalBody.innerHTML = `
      <div class="modal-field">
        <label>اكتب ملاحظتك للأستاذ ليو:</label>
        <textarea id="feedbackText" placeholder="اكتب تفاصيل المسألة أو أي ميزة تحتاجها في منهجك الدراسي..."></textarea>
      </div>
      <button class="modal-primary-btn" id="sendFeedbackBtn">إرسال التقرير</button>
    `;

    document.getElementById('sendFeedbackBtn').onclick = async () => {
      const text = document.getElementById('feedbackText').value.trim();
      if (!text) return;
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      closeModal();
      showToast('شكراً لملاحظتك! تم إرسالها إلى النظام');
    };

    openModal();
  };

  // Logout / Switch Student Account
  const triggerLogout = () => {
    showCustomConfirm({
      title: 'تسجيل الخروج',
      message: 'هل ترغب بتسجيل الخروج وتبديل الحساب الدراسي؟',
      okText: 'تسجيل الخروج',
      danger: true,
      onConfirm: async () => {
        if (window.LeoFirebase && typeof window.LeoFirebase.signOutUser === 'function') {
          await window.LeoFirebase.signOutUser().catch(() => {});
        }
        localStorage.removeItem('leo_student_profile');
        studentProfile = null;
        window.location.replace('login.html');
      }
    });
  };

  logoutRow.onclick = triggerLogout;
  if (drawerQuickLogoutBtn) {
    drawerQuickLogoutBtn.onclick = triggerLogout;
  }

  // Modal Handlers
  function openModal() { customModalOverlay.classList.add('active'); }
  function closeModal() { customModalOverlay.classList.remove('active'); }
  modalCloseBtn.onclick = closeModal;
  customModalOverlay.onclick = (e) => { if (e.target === customModalOverlay) closeModal(); };

  // Settings Save to Server
  async function saveSettingsToServer() {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsState)
      });
    } catch (e) {}
  }

  // --- Initial Startup & Profile Check ---
  async function startup() {
    try {
      // 0. Immediate synchronous restore of conversation and sidebar index (0ms latency, prevents screen wipe on refresh!)
      const cachedActiveConvId = localStorage.getItem('leo_active_conv_id');
      const cachedIndex = getConversationsIndexFromLocalCache();
      if (cachedIndex && cachedIndex.length > 0) {
        renderRecentConversations(cachedIndex);
      }
      if (cachedActiveConvId) {
        const cachedActiveConv = getConversationFromLocalCache(cachedActiveConvId);
        if (cachedActiveConv && cachedActiveConv.messages && cachedActiveConv.messages.length > 0) {
          currentConversationId = cachedActiveConvId;
          renderConversationMessages(cachedActiveConv.messages);
        }
      }

      // 1. Immediate localStorage profile cache restore (strictly purge any placeholder 'الطالب')
      const localCachedProf = localStorage.getItem('leo_student_profile');
      if (localCachedProf) {
        try {
          const parsedLocal = JSON.parse(localCachedProf);
          if (parsedLocal && parsedLocal.name && parsedLocal.name.trim() && parsedLocal.name.trim() !== 'الطالب') {
            studentProfile = parsedLocal;
            updateProfileUI();
          } else {
            localStorage.removeItem('leo_student_profile');
          }
        } catch (e) {
          localStorage.removeItem('leo_student_profile');
        }
      }

      // 2. Fetch Profile from server for this device/user
      const profRes = await fetch('/api/profile');
      if (profRes.ok) {
        const p = await profRes.json();
        if (p && p.name && p.name.trim() && p.name.trim() !== 'الطالب') {
          studentProfile = p;
          localStorage.setItem('leo_student_profile', JSON.stringify(p));
          updateProfileUI();
        } else if (studentProfile && studentProfile.name && studentProfile.name.trim() !== 'الطالب') {
          // If server restarted, sync our verified local profile to server
          fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentProfile)
          });
        }
      }

      // 3. Strict Authentication Check: If no real user data exists, redirect to login page!
      if (!studentProfile || !studentProfile.name || studentProfile.name.trim() === 'الطالب') {
        window.location.replace('login.html');
        return;
      }

      // 4. Fetch Settings
      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const s = await setRes.json();
        if (s && Object.keys(s).length > 0) {
          settingsState = { ...settingsState, ...s };
          if (settingsState.bubbleTheme) {
            bubbleThemes.forEach(t => document.body.classList.remove(t.id));
            document.body.classList.add(settingsState.bubbleTheme);
            const tObj = bubbleThemes.find(t => t.id === settingsState.bubbleTheme);
            if (tObj) {
              currentBubbleThemeLabel.textContent = tObj.name;
              document.getElementById('glowingOrbPreview').style.background = tObj.preview;
            }
          }
        }
      }

      // Apply saved appearance (Dark / Light / System)
      applyAppearance(settingsState.appearance || 'dark');

      // 5. Set model label
      const activeModelItem = document.querySelector(`.dropdown-item[data-model="${selectedModel}"]`);
      if (activeModelItem) {
        document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        activeModelItem.classList.add('active');
        currentModelLabel.textContent = activeModelItem.querySelector('.item-title').textContent;
      }

      // 6. Load Conversation History & Memories
      loadConversationHistory();
      refreshMemoriesUI();

      // 7. Background Sync: Push all locally cached conversations to server DB & Firebase Cloud
      //    This ensures conversations survive server restarts, Vercel cold starts, and DB resets.
      syncLocalConversationsToServer();

      // 8. Firebase Realtime Cloud Synchronization
      initFirebaseStartup();

    } catch (e) {
      console.error('Startup error:', e);
    }
  }

  // --- Firebase Cloud Sync Initialization ---
  async function initFirebaseStartup() {
    if (!window.LeoFirebase) {
      window.addEventListener('load', () => setTimeout(initFirebaseStartup, 200), { once: true });
      return;
    }

    try {
      await window.LeoFirebase.ensureAuthenticated(deviceUserId, studentProfile ? studentProfile.name : '');

      // Realtime listener: Any change in Firebase immediately updates the sidebar & cache
      window.LeoFirebase.onConversationsChanged((firebaseConvs) => {
        if (Array.isArray(firebaseConvs) && firebaseConvs.length > 0) {
          saveConversationsIndexToLocalCache(firebaseConvs);
          const filtered = viewingArchived ? firebaseConvs.filter(c => c.archived) : firebaseConvs.filter(c => !c.archived);
          renderRecentConversations(filtered);

          firebaseConvs.forEach(fc => {
            if (fc && fc.id && Array.isArray(fc.messages)) {
              try {
                localStorage.setItem(`leo_conv_${fc.id}`, JSON.stringify(fc));
              } catch (e) {}
            }
          });

          if (currentConversationId) {
            const activeCloud = firebaseConvs.find(c => c.id === currentConversationId);
            if (activeCloud && activeCloud.messages && activeCloud.messages.length > 0) {
              const currentRows = messagesStreamList.querySelectorAll('.message-row');
              if (currentRows.length === 0) {
                renderConversationMessages(activeCloud.messages);
              }
            }
          }
        }
      });

      // Restore profile from Firebase if local is missing
      const cloudProfile = await window.LeoFirebase.getProfile();
      if (cloudProfile && cloudProfile.name && (!studentProfile || !studentProfile.name || studentProfile.name === 'الطالب')) {
        studentProfile = cloudProfile;
        localStorage.setItem('leo_student_profile', JSON.stringify(cloudProfile));
        updateProfileUI();
      } else if (studentProfile && studentProfile.name && studentProfile.name !== 'الطالب') {
        window.LeoFirebase.saveProfile(studentProfile).catch(() => {});
      }

      // Sync local conversations to Firebase cloud
      syncLocalConversationsToFirebase();

    } catch (err) {
      console.warn('Firebase startup initialization notice:', err);
    }
  }

  // --- Sync local conversations to Firebase Cloud ---
  async function syncLocalConversationsToFirebase() {
    if (!window.LeoFirebase || typeof window.LeoFirebase.saveConversation !== 'function') return;
    try {
      const indexRaw = localStorage.getItem('leo_conversations_index');
      if (!indexRaw) return;
      const index = JSON.parse(indexRaw);
      if (!Array.isArray(index) || index.length === 0) return;

      for (const conv of index) {
        if (!conv || !conv.id) continue;
        const cached = getConversationFromLocalCache(conv.id);
        const dataToPush = (cached && cached.messages) ? cached : {
          id: conv.id,
          title: conv.title || 'محادثة دراسية',
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          model: conv.model,
          pinned: conv.pinned,
          archived: conv.archived,
          messages: []
        };
        await window.LeoFirebase.saveConversation(dataToPush).catch(() => {});
      }
    } catch (e) {
      console.warn('Firebase local sync failed (non-critical):', e);
    }
  }

  // --- Background Sync: Push localStorage conversations to server for persistence ---
  async function syncLocalConversationsToServer() {
    try {
      const indexRaw = localStorage.getItem('leo_conversations_index');
      if (!indexRaw) return;
      const index = JSON.parse(indexRaw);
      if (!Array.isArray(index) || index.length === 0) return;

      const fullConversations = [];
      for (const conv of index) {
        if (!conv || !conv.id) continue;
        const cached = getConversationFromLocalCache(conv.id);
        if (cached && cached.messages && cached.messages.length > 0) {
          fullConversations.push(cached);
        } else {
          // Even without messages, sync the conversation shell
          fullConversations.push({
            id: conv.id,
            title: conv.title || 'محادثة دراسية',
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            model: conv.model,
            pinned: conv.pinned,
            archived: conv.archived,
            messages: []
          });
        }
      }

      if (fullConversations.length > 0) {
        fetch('/api/conversations/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversations: fullConversations })
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Background sync failed (non-critical):', e);
    }
  }

  startup();
});
