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
  const learningModeSelect = document.getElementById('learningModeSelect');
  const finishProfileBtn = document.getElementById('finishProfileBtn');

  let currentMode = 'signin'; // 'signin' or 'signup'
  let selectedGender = 'male';

  // --- Curriculum Stages & Grades Map ---
  const curriculumGrades = {
    'الابتدائية': [
      'الأول الابتدائي',
      'الثاني الابتدائي',
      'الثالث الابتدائي',
      'الرابع الابتدائي',
      'الخامس الابتدائي',
      'السادس الابتدائي (وزاري)'
    ],
    'المتوسطة': [
      'الأول متوسط',
      'الثاني متوسط',
      'الثالث متوسط (وزاري)'
    ],
    'الإعدادية': [
      'الرابع العلمي',
      'الرابع الأدبي',
      'الخامس العلمي',
      'الخامس الأدبي',
      'السادس العلمي (وزاري)',
      'السادس الأدبي (وزاري)'
    ]
  };

  // --- Theme Controller (Dark / Light & 'T' key) ---
  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeText) themeText.textContent = 'الوضع الداكن';
      localStorage.setItem('leo_theme', 'light');
    } else {
      document.body.classList.remove('theme-light');
      if (themeIcon) themeIcon.textContent = '☀️';
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
      authSubmitBtnText.textContent = 'تسجيل الدخول 🚀';
      clearAlert();
    });

    tabSignUpBtn.addEventListener('click', () => {
      currentMode = 'signup';
      tabSignUpBtn.classList.add('active');
      tabSignInBtn.classList.remove('active');
      confirmPasswordContainer.style.display = 'block';
      authSubmitBtnText.textContent = 'إنشاء الحساب ومتابعة التخصيص 🎓';
      clearAlert();
    });
  }

  // --- Toggle Password Visibility ---
  if (togglePasswordVisibilityBtn && passwordInput) {
    togglePasswordVisibilityBtn.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      if (confirmPasswordInput) confirmPasswordInput.type = isPass ? 'text' : 'password';
      togglePasswordVisibilityBtn.textContent = isPass ? '🔒' : '👁️';
    });
  }

  // --- Stage & Grade Select Population ---
  function populateGrades(stage) {
    if (!gradeSelect) return;
    const grades = curriculumGrades[stage] || [];
    gradeSelect.innerHTML = '';
    grades.forEach((g, idx) => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      if (idx === grades.length - 1) opt.selected = true; // Default to ministerial class
      gradeSelect.appendChild(opt);
    });
  }

  if (stageSelect) {
    stageSelect.addEventListener('change', (e) => {
      populateGrades(e.target.value);
    });
    populateGrades(stageSelect.value || 'المتوسطة');
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

  function finishAuthAndEnter(profileData) {
    // 1. Save profile to localStorage
    localStorage.setItem('leo_student_profile', JSON.stringify(profileData));

    // 2. Sync profile to Firebase if available
    if (window.LeoFirebase && typeof window.LeoFirebase.saveProfile === 'function') {
      window.LeoFirebase.saveProfile(profileData).catch(() => {});
    }

    // 3. Show success alert briefly and redirect to the main app (Clean URL / without index.html)!
    showAlert(`تم تجهيز حسابك بنجاح! جاري تحويلك إلى قاعة الدراسة...`, 'success');
    setTimeout(() => {
      window.location.replace(window.location.protocol === 'file:' ? 'index.html' : '/');
    }, 400);
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
        if (existingCloudProfile && existingCloudProfile.name && existingCloudProfile.grade) {
          finishAuthAndEnter(existingCloudProfile);
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
        if (existingCloudProfile && existingCloudProfile.name && existingCloudProfile.grade) {
          finishAuthAndEnter(existingCloudProfile);
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
      authSubmitBtnText.textContent = 'جاري التحقق... ⏳';

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
          if (cloudProfile && cloudProfile.name && cloudProfile.grade) {
            finishAuthAndEnter(cloudProfile);
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
    finishProfileBtn.addEventListener('click', () => {
      const studentName = studentNameInput ? studentNameInput.value.trim() : '';
      if (!studentName) {
        alert('يرجى كتابة اسمك أو لقبك الدراسي لمتابعة الدخول.');
        if (studentNameInput) studentNameInput.focus();
        return;
      }

      const stage = stageSelect ? stageSelect.value : 'المتوسطة';
      const grade = gradeSelect ? gradeSelect.value : 'الثالث متوسط (وزاري)';
      const studyMode = learningModeSelect ? learningModeSelect.value : 'شرح مبسط ومباشر';

      const finalProfile = {
        name: studentName,
        gender: selectedGender,
        stage: stage,
        grade: grade,
        studyMode: studyMode,
        avatarIcon: selectedGender === 'female' ? '👩‍🎓' : '👨‍🎓',
        updated_at: Date.now()
      };

      finishAuthAndEnter(finalProfile);
    });
  }
});
