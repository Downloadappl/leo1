/**
 * صفحة تسجيل الدخول وتخصيص تجربة الطالب — منصة الأستاذ ليو
 * Google Sign-In, Email/Password, Theme Toggling (T key), Iraqi Curriculum Onboarding
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Elements ---
  const authStep1 = document.getElementById('authStep1');
  const authStep2 = document.getElementById('authStep2');
  const authAlert = document.getElementById('authAlert');

  // Theme Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  // Existing Session Banner
  const existingSessionBanner = document.getElementById('existingSessionBanner');
  const existingUserName = document.getElementById('existingUserName');

  // Step 1: Auth Elements
  const googleAuthBtn = document.getElementById('googleAuthBtn');
  const githubAuthBtn = document.getElementById('githubAuthBtn');
  const tabSignInBtn = document.getElementById('tabSignInBtn');
  const tabSignUpBtn = document.getElementById('tabSignUpBtn');
  const emailAuthForm = document.getElementById('emailAuthForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const confirmPasswordContainer = document.getElementById('confirmPasswordContainer');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const togglePasswordVisibilityBtn = document.getElementById('togglePasswordVisibilityBtn');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authSubmitBtnText = document.getElementById('authSubmitBtnText');
  const guestAccessBtn = document.getElementById('guestAccessBtn');

  // Step 2: Profile Setup Elements
  const studentNameInput = document.getElementById('studentNameInput');
  const genderMale = document.getElementById('genderMale');
  const genderFemale = document.getElementById('genderFemale');
  const stageSelect = document.getElementById('stageSelect');
  const gradeSelect = document.getElementById('gradeSelect');
  const universityFields = document.getElementById('universityFields');
  const universityInput = document.getElementById('universityInput');
  const specializationInput = document.getElementById('specializationInput');
  const learningModeSelect = document.getElementById('learningModeSelect');
  const finishProfileBtn = document.getElementById('finishProfileBtn');

  let currentMode = 'signin'; // 'signin' or 'signup'
  let selectedGender = 'male';

  // --- Curriculum Stages & Grades Map ---
  const curriculumGrades = {
    primary: [
      { id: 'first_primary', label: 'الصف الأول الابتدائي' },
      { id: 'second_primary', label: 'الصف الثاني الابتدائي' },
      { id: 'third_primary', label: 'الصف الثالث الابتدائي' },
      { id: 'fourth_primary', label: 'الصف الرابع الابتدائي' },
      { id: 'fifth_primary', label: 'الصف الخامس الابتدائي' },
      { id: 'sixth_primary', label: 'الصف السادس الابتدائي (وزاري)' }
    ],
    middle: [
      { id: 'first_middle', label: 'الصف الأول متوسط' },
      { id: 'second_middle', label: 'الصف الثاني متوسط' },
      { id: 'third_middle', label: 'الصف الثالث متوسط (وزاري)' }
    ],
    preparatory: [
      { id: 'fourth_scientific', label: 'الرابع الإعدادي (العلمي)' },
      { id: 'fourth_literary', label: 'الرابع الإعدادي (الأدبي)' },
      { id: 'fifth_scientific', label: 'الخامس الإعدادي (العلمي)' },
      { id: 'fifth_literary', label: 'الخامس الإعدادي (الأدبي)' },
      { id: 'sixth_scientific', label: 'السادس الإعدادي (العلمي - بكالوريا وزاري)' },
      { id: 'sixth_literary', label: 'السادس الإعدادي (الأدبي - بكالوريا وزاري)' },
      { id: 'sixth_vocational', label: 'السادس الإعدادي (المهني / صناعي / تجاري)' }
    ],
    university: [
      { id: 'uni_stage_1', label: 'المرحلة الأولى' },
      { id: 'uni_stage_2', label: 'المرحلة الثانية' },
      { id: 'uni_stage_3', label: 'المرحلة الثالثة' },
      { id: 'uni_stage_4', label: 'المرحلة الرابعة' },
      { id: 'uni_stage_5', label: 'المرحلة الخامسة (طب / هندسة)' },
      { id: 'uni_stage_6', label: 'المرحلة السادسة (طب بشري)' },
      { id: 'postgraduate', label: 'الدراسات العليا (ماجستير / دكتوراه)' }
    ]
  };

  const SUN_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  const MOON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      document.documentElement.classList.add('theme-light');
      if (themeIcon) themeIcon.innerHTML = MOON_SVG;
      if (themeText) themeText.textContent = 'الوضع الداكن';
      localStorage.setItem('leo_theme', 'light');
    } else {
      document.body.classList.remove('theme-light');
      document.documentElement.classList.remove('theme-light');
      if (themeIcon) themeIcon.innerHTML = SUN_SVG;
      if (themeText) themeText.textContent = 'الوضع الفاتح';
      localStorage.setItem('leo_theme', 'dark');
    }
  }

  // Load Saved Theme
  const savedTheme = localStorage.getItem('leo_theme') || 'dark';
  applyTheme(savedTheme);

  // Toggle Theme via Button
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isLight = document.body.classList.contains('theme-light');
      applyTheme(isLight ? 'dark' : 'light');
    });
  }

  // Toggle Theme via 'T' or 't' Key Shortcut
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      return; // Do not trigger when student is typing
    }
    if (e.key === 't' || e.key === 'T' || e.key === 'ف') {
      e.preventDefault();
      const isLight = document.body.classList.contains('theme-light');
      applyTheme(isLight ? 'dark' : 'light');
    }
  });

  // --- Check for Existing Local Profile ---
  try {
    const rawProfile = localStorage.getItem('leo_student_profile');
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      if (p && p.name && p.name.trim() && p.name.trim() !== 'الطالب') {
        if (existingSessionBanner && existingUserName) {
          existingUserName.textContent = p.name;
          existingSessionBanner.style.display = 'flex';
        }
      }
    }
  } catch (e) {}

  // --- Show Alert Message ---
  function showAlert(message, type = 'error') {
    if (!authAlert) return;
    authAlert.textContent = message;
    authAlert.className = `auth-toast-alert ${type}`;
    authAlert.style.display = 'block';
  }

  function clearAlert() {
    if (!authAlert) return;
    authAlert.textContent = '';
    authAlert.style.display = 'none';
  }

  // --- Tab Switching (Sign In vs Sign Up) ---
  if (tabSignInBtn && tabSignUpBtn) {
    tabSignInBtn.addEventListener('click', () => {
      currentMode = 'signin';
      tabSignInBtn.classList.add('active');
      tabSignUpBtn.classList.remove('active');
      confirmPasswordContainer.style.display = 'none';
      authSubmitBtnText.textContent = 'تسجيل الدخول';
      clearAlert();
    });

    tabSignUpBtn.addEventListener('click', () => {
      currentMode = 'signup';
      tabSignUpBtn.classList.add('active');
      tabSignInBtn.classList.remove('active');
      confirmPasswordContainer.style.display = 'block';
      authSubmitBtnText.textContent = 'إنشاء الحساب ومتابعة التخصيص';
      clearAlert();
    });
  }

  // --- Toggle Password Visibility ---
  const EYE_OPEN_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="7" r="3"/></svg>`;
  const EYE_OFF_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  if (togglePasswordVisibilityBtn && passwordInput) {
    togglePasswordVisibilityBtn.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      if (confirmPasswordInput) confirmPasswordInput.type = isPass ? 'text' : 'password';
      togglePasswordVisibilityBtn.innerHTML = isPass ? EYE_OFF_SVG : EYE_OPEN_SVG;
    });
  }

  // --- Stage & Grade Select Population ---
  function populateGrades(stage) {
    if (!gradeSelect) return;
    const grades = curriculumGrades[stage] || curriculumGrades.middle;
    gradeSelect.innerHTML = '';
    grades.forEach((grade, idx) => {
      const opt = document.createElement('option');
      opt.value = grade.id;
      opt.textContent = grade.label;
      if (stage === 'university' ? idx === 0 : idx === grades.length - 1) opt.selected = true;
      gradeSelect.appendChild(opt);
    });
  }

  function syncUniversityFields() {
    const isUniversity = stageSelect && stageSelect.value === 'university';
    if (universityFields) universityFields.style.display = isUniversity ? 'flex' : 'none';
  }

  if (stageSelect) {
    stageSelect.addEventListener('change', (e) => {
      populateGrades(e.target.value);
      syncUniversityFields();
    });
    populateGrades(stageSelect.value || 'middle');
    syncUniversityFields();
  }

  // --- Gender Selection Pill ---
  function setGender(gender) {
    selectedGender = gender;
    if (gender === 'male') {
      genderMale.classList.add('active');
      genderFemale.classList.remove('active');
    } else {
      genderFemale.classList.add('active');
      genderMale.classList.remove('active');
    }
  }

  if (genderMale) genderMale.addEventListener('click', () => setGender('male'));
  if (genderFemale) genderFemale.addEventListener('click', () => setGender('female'));

  // --- Smooth Step Navigation ---
  function goToStep2(prefilledName = '') {
    clearAlert();
    authStep1.classList.remove('active');
    authStep2.classList.add('active');
    if (studentNameInput && prefilledName) {
      studentNameInput.value = prefilledName;
    }
    if (studentNameInput) studentNameInput.focus();
  }

  async function finishAuthAndEnter(profileData) {
    profileData = normalizeStudentProfile(profileData);
    // 1. Save profile to localStorage
    localStorage.setItem('leo_student_profile', JSON.stringify(profileData));

    // 2. Sync the profile with the local app database before the chat loads it.
    await Promise.all([
      fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      }).catch(() => null),
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyMode: profileData.studyMode || 'standard' })
      }).catch(() => null)
    ]);

    // 3. Sync profile to Firebase if available
    if (window.LeoFirebase && typeof window.LeoFirebase.saveProfile === 'function') {
      await window.LeoFirebase.saveProfile(profileData).catch(() => {});
    }

    // 4. Show success alert briefly and redirect to the main app!
    showAlert(`تم تجهيز حسابك بنجاح! جاري تحويلك إلى قاعة الدراسة...`, 'success');
    setTimeout(() => {
      window.location.replace('index.html');
    }, 400);
  }

  function normalizeStudentProfile(profile) {
    const normalized = { ...(profile || {}) };
    const stageAliases = {
      'الابتدائية': 'primary', 'المرحلة الابتدائية': 'primary',
      'المتوسطة': 'middle', 'المرحلة المتوسطة': 'middle',
      'الإعدادية': 'preparatory', 'الاعدادية': 'preparatory', 'المرحلة الإعدادية': 'preparatory',
      'الجامعية': 'university', 'المرحلة الجامعية': 'university', 'المرحلة الجامعية والدراسات': 'university'
    };
    normalized.stage = stageAliases[normalized.stage] || normalized.stage || 'preparatory';
    if (!curriculumGrades[normalized.stage]) normalized.stage = 'preparatory';
    if (!normalized.grade_sub && normalized.grade) {
      const gradeText = String(normalized.grade);
      const gradeMap = {
        'الأول الابتدائي': 'first_primary', 'الثاني الابتدائي': 'second_primary', 'الثالث الابتدائي': 'third_primary',
        'الرابع الابتدائي': 'fourth_primary', 'الخامس الابتدائي': 'fifth_primary', 'السادس الابتدائي': 'sixth_primary',
        'الأول متوسط': 'first_middle', 'الثاني متوسط': 'second_middle', 'الثالث متوسط': 'third_middle',
        'الرابع العلمي': 'fourth_scientific', 'الرابع الأدبي': 'fourth_literary',
        'الخامس العلمي': 'fifth_scientific', 'الخامس الأدبي': 'fifth_literary',
        'السادس العلمي': 'sixth_scientific', 'السادس الأدبي': 'sixth_literary',
        'الأولى': 'uni_stage_1', 'الثانية': 'uni_stage_2', 'الثالثة': 'uni_stage_3',
        'الرابعة': 'uni_stage_4', 'الخامسة': 'uni_stage_5', 'السادسة': 'uni_stage_6'
      };
      const matched = Object.entries(gradeMap).find(([label]) => gradeText.includes(label));
      normalized.grade_sub = matched ? matched[1] : (normalized.stage === 'university' ? 'uni_stage_1' : 'sixth_scientific');
    }
    if (!curriculumGrades[normalized.stage].some((grade) => grade.id === normalized.grade_sub)) {
      const grades = curriculumGrades[normalized.stage];
      normalized.grade_sub = normalized.stage === 'university' ? grades[0].id : grades[grades.length - 1].id;
    }
    normalized.university = normalized.university || '';
    normalized.specialization = normalized.specialization || '';
    return normalized;
  }

  // --- 1. Google Sign-In Handler ---
  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', async () => {
      clearAlert();
      googleAuthBtn.disabled = true;
      googleAuthBtn.style.opacity = '0.7';

      try {
        if (!window.LeoFirebase || typeof window.LeoFirebase.signInWithGoogle !== 'function') {
          throw new Error('جاري تحميل خدمات المصادقة، يرجى المحاولة بعد لحظات');
        }

        const user = await window.LeoFirebase.signInWithGoogle();
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : '');

        // Check if user already had a saved profile in Firebase
        const existingCloudProfile = await window.LeoFirebase.getProfile().catch(() => null);
        if (existingCloudProfile && existingCloudProfile.name && (existingCloudProfile.grade_sub || existingCloudProfile.grade)) {
          await finishAuthAndEnter(existingCloudProfile);
          return;
        }

        // Otherwise, move to Step 2 to pick Stage & Grade
        goToStep2(displayName);

      } catch (err) {
        console.warn('Google Auth Error:', err);
        googleAuthBtn.disabled = false;
        googleAuthBtn.style.opacity = '1';

        if (err.code === 'auth/unauthorized-domain') {
          showAlert('يرجى إضافة نطاق الموقع في إعدادات Google Firebase، أو يمكنك تسجيل الدخول بالبريد الإلكتروني أو كزائر فوراً.');
        } else if (err.code === 'auth/popup-closed-by-user') {
          showAlert('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
        } else if (err.code === 'auth/network-request-failed') {
          showAlert('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت أو استخدام خيار الدخول كزائر.');
        } else {
          showAlert(err.message || 'حدث خطأ أثناء تسجيل الدخول عبر Google. يمكنك المتابعة بالبريد أو كزائر.');
        }
      }
    });
  }

  // --- 2. GitHub Sign-In Handler ---
  if (githubAuthBtn) {
    githubAuthBtn.addEventListener('click', async () => {
      clearAlert();
      githubAuthBtn.disabled = true;
      githubAuthBtn.style.opacity = '0.7';

      try {
        if (!window.LeoFirebase || typeof window.LeoFirebase.signInWithGithub !== 'function') {
          throw new Error('جاري تحميل خدمات المصادقة، يرجى المحاولة بعد لحظات');
        }

        const user = await window.LeoFirebase.signInWithGithub();
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'مطور GitHub');

        // Check if user already had a saved profile in Firebase
        const existingCloudProfile = await window.LeoFirebase.getProfile().catch(() => null);
        if (existingCloudProfile && existingCloudProfile.name && (existingCloudProfile.grade_sub || existingCloudProfile.grade)) {
          await finishAuthAndEnter(existingCloudProfile);
          return;
        }

        goToStep2(displayName);

      } catch (err) {
        console.warn('GitHub Auth Error:', err);
        githubAuthBtn.disabled = false;
        githubAuthBtn.style.opacity = '1';

        if (err.code === 'auth/unauthorized-domain') {
          showAlert('يرجى إضافة نطاق الموقع في إعدادات Firebase، أو المتابعة بالبريد أو كزائر فوراً.');
        } else if (err.code === 'auth/popup-closed-by-user') {
          showAlert('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
        } else if (err.code === 'auth/account-exists-with-different-credential') {
          showAlert('هذا البريد مسجل مسبقاً بموفر خدمة آخر (مثل Google أو البريد).');
        } else if (err.code === 'auth/operation-not-allowed') {
          showAlert('تسجيل GitHub بانتظار إدخال Client ID و Secret في Firebase Console.');
        } else {
          showAlert(err.message || 'حدث خطأ أثناء تسجيل الدخول عبر GitHub. يمكنك المتابعة بالبريد أو كزائر.');
        }
      }
    });
  }

  // --- 3. Email & Password Sign-In / Sign-Up Form ---
  if (emailAuthForm) {
    emailAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showAlert('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
        return;
      }

      if (password.length < 6) {
        showAlert('يجب أن تتكون كلمة المرور من 6 خانات على الأقل.');
        return;
      }

      authSubmitBtn.disabled = true;
      const originalBtnText = authSubmitBtnText.textContent;
      authSubmitBtnText.textContent = 'جاري التحقق...';

      try {
        if (!window.LeoFirebase) {
          throw new Error('خدمة المصادقة قيد التهيئة، يرجى الانتظار ثانية واحدة.');
        }

        if (currentMode === 'signup') {
          // Sign Up
          const confirmPassword = confirmPasswordInput.value;
          if (password !== confirmPassword) {
            showAlert('كلمتا المرور غير متطابقتين.');
            authSubmitBtn.disabled = false;
            authSubmitBtnText.textContent = originalBtnText;
            return;
          }

          const defaultName = email.split('@')[0];
          await window.LeoFirebase.signUp(email, password, { name: defaultName });
          // Proceed to Step 2 for grade customization
          goToStep2(defaultName);

        } else {
          // Sign In
          await window.LeoFirebase.signIn(email, password);

          // Check if profile exists
          const cloudProfile = await window.LeoFirebase.getProfile().catch(() => null);
          if (cloudProfile && cloudProfile.name && (cloudProfile.grade_sub || cloudProfile.grade)) {
            await finishAuthAndEnter(cloudProfile);
          } else {
            const fallbackName = email.split('@')[0];
            goToStep2(fallbackName);
          }
        }

      } catch (err) {
        console.warn('Auth Error:', err);
        authSubmitBtn.disabled = false;
        authSubmitBtnText.textContent = originalBtnText;

        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          showAlert('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        } else if (err.code === 'auth/email-already-in-use') {
          showAlert('هذا البريد الإلكتروني مسجل مسبقاً، يمكنك تسجيل الدخول مباشرة.');
        } else if (err.code === 'auth/invalid-email') {
          showAlert('صيغة البريد الإلكتروني غير صالحة.');
        } else if (err.code === 'auth/network-request-failed') {
          showAlert('خطأ في الاتصال بالشبكة، يرجى التحقق من اتصالك بالإنترنت.');
        } else {
          showAlert(err.message || 'تعذر إتمام العملية، يرجى المحاولة مجدداً.');
        }
      }
    });
  }

  // --- 3. Guest Access ---
  if (guestAccessBtn) {
    guestAccessBtn.addEventListener('click', () => {
      goToStep2('طالب ضيف');
    });
  }

  // --- 4. Finish Profile (Step 2) ---
  if (finishProfileBtn) {
    finishProfileBtn.addEventListener('click', async () => {
      const studentName = studentNameInput ? studentNameInput.value.trim() : '';
      if (!studentName) {
        alert('يرجى كتابة اسمك أو لقبك الدراسي لمتابعة الدخول.');
        if (studentNameInput) studentNameInput.focus();
        return;
      }

      const stage = stageSelect ? stageSelect.value : 'middle';
      const grade_sub = gradeSelect ? gradeSelect.value : 'third_middle';
      const studyMode = learningModeSelect ? learningModeSelect.value : 'standard';
      let university = '';
      if (stage === 'university') {
        university = universityInput ? universityInput.value.trim() : '';
        if (!university) {
          showAlert('يرجى كتابة أو اختيار اسم الجامعة أو المعهد.');
          universityInput && universityInput.focus();
          return;
        }
      }

      const finalProfile = {
        name: studentName,
        gender: selectedGender,
        stage: stage,
        grade_sub,
        university,
        specialization: specializationInput ? specializationInput.value.trim() : '',
        studyMode: studyMode,
        avatarIcon: selectedGender === 'female' ? 'female' : 'male',
        updated_at: Date.now()
      };

      await finishAuthAndEnter(finalProfile);
    });
  }
});
