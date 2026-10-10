// ==============================================================================
// 🎓 منصة الأستاذ ليو — خدمة الربط والتخزين السحابي عبر Firebase (Firestore & RTDB & Auth)
// ==============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  onAuthStateChanged, 
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  deleteDoc, 
  updateDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  child, 
  update, 
  remove 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

// إعدادات Firebase الخاصة بالمشروع
const firebaseConfig = {
  apiKey: "AIzaSyCvpFe2QE8wSs7VT7OpkdQfz8egieKUukY",
  authDomain: "msi9nw.firebaseapp.com",
  databaseURL: "https://msi9nw-default-rtdb.firebaseio.com",
  projectId: "msi9nw",
  storageBucket: "msi9nw.firebasestorage.app",
  messagingSenderId: "713866703433",
  appId: "1:713866703433:web:d3dd6def0af5062fc00598",
  measurementId: "G-E670KYLEY5"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // Analytics is optional in restricted/offline environments
}

const auth = getAuth(app);
const db = getFirestore(app);
let rtdb = null;
try {
  rtdb = getDatabase(app);
} catch (e) {}

// كائن خدمة Firebase الشامل الذي سنشاركه مع التطبيق
window.LeoFirebase = {
  app,
  auth,
  db,
  rtdb,
  currentUser: null,
  isReady: false,
  _conversationsUnsubscribe: null,
  _authListeners: [],
  _convListeners: [],

  // تسجيل مستمعي حالة تسجيل الدخول
  onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      this._authListeners.push(callback);
      if (this.isReady) {
        callback(this.currentUser);
      }
    }
  },

  // تسجيل مستمعي تغييرات المحادثات الحية (Realtime Snapshot)
  onConversationsChanged(callback) {
    if (typeof callback === 'function') {
      this._convListeners.push(callback);
    }
  },

  _notifyAuth(user) {
    this.currentUser = user;
    this._authListeners.forEach(cb => {
      try { cb(user); } catch (e) { console.error('Auth listener error:', e); }
    });
  },

  _notifyConversations(convs) {
    this._convListeners.forEach(cb => {
      try { cb(convs); } catch (e) { console.error('Conv listener error:', e); }
    });
  },

  // ضمان وجود حساب مصادق عليه (حساب مخصص أو حساب جهاز دائم)
  async ensureAuthenticated(deviceUserId, studentName = '') {
    if (auth.currentUser) {
      this.currentUser = auth.currentUser;
      this._setupConversationsRealtimeListener();
      return auth.currentUser;
    }

    const cleanDeviceId = (deviceUserId || 'device_default').replace(/[^a-zA-Z0-9]/g, '');
    const fallbackEmail = `student_${cleanDeviceId}@leo.academic.iq`;
    const fallbackPass = `Leo2026_${cleanDeviceId}!`;

    try {
      const cred = await signInWithEmailAndPassword(auth, fallbackEmail, fallbackPass);
      this.currentUser = cred.user;
      this._setupConversationsRealtimeListener();
      return cred.user;
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, fallbackEmail, fallbackPass);
          if (studentName) {
            await updateProfile(newCred.user, { displayName: studentName }).catch(() => {});
          }
          this.currentUser = newCred.user;
          this._setupConversationsRealtimeListener();
          return newCred.user;
        } catch (createErr) {
          console.warn('Firebase auto-signup failed, retry signin:', createErr);
        }
      }
      throw err;
    }
  },

  // تسجيل الدخول بالبريد وكلمة المرور
  async signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    this.currentUser = cred.user;
    this._setupConversationsRealtimeListener();
    return cred.user;
  },

  // تسجيل الدخول السريع عبر Google
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    this.currentUser = cred.user;
    this._setupConversationsRealtimeListener();
    return cred.user;
  },

  // تسجيل الدخول السريع عبر GitHub
  async signInWithGithub() {
    const provider = new GithubAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    this.currentUser = cred.user;
    this._setupConversationsRealtimeListener();
    return cred.user;
  },

  // إنشاء حساب جديد بالبريد وكلمة المرور
  async signUp(email, password, profileData) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    this.currentUser = cred.user;
    if (profileData && profileData.name) {
      await updateProfile(cred.user, { displayName: profileData.name }).catch(() => {});
      await this.saveProfile(profileData);
    }
    this._setupConversationsRealtimeListener();
    return cred.user;
  },

  // تسجيل الخروج
  async signOutUser() {
    if (this._conversationsUnsubscribe) {
      this._conversationsUnsubscribe();
      this._conversationsUnsubscribe = null;
    }
    await signOut(auth);
    this.currentUser = null;
  },

  // حفظ بيانات الطالب في Firestore
  async saveProfile(profileData) {
    if (!profileData) return;
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return;

    try {
      const profRef = doc(db, 'users', uid, 'profile', 'info');
      await setDoc(profRef, {
        ...profileData,
        updated_at: Date.now()
      }, { merge: true });

      // محاولة حفظ نسخة احتياطية في Realtime Database إن كانت متاحة
      if (rtdb) {
        set(ref(rtdb, `users/${uid}/profile`), profileData).catch(() => {});
      }
    } catch (e) {
      console.warn('Firebase saveProfile warning:', e);
    }
  },

  // جلب بيانات الطالب من Firestore
  async getProfile() {
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return null;

    try {
      const profRef = doc(db, 'users', uid, 'profile', 'info');
      const snap = await getDoc(profRef);
      if (snap.exists()) {
        return snap.data();
      }
    } catch (e) {
      console.warn('Firebase getProfile warning:', e);
    }
    return null;
  },

  // Long-term memories live in Firestore so they survive serverless restarts.
  async getMemories() {
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return null;

    try {
      const memoriesRef = collection(db, 'users', uid, 'memories');
      const snapshot = await getDocs(memoriesRef);
      return snapshot.docs
        .map((memoryDoc) => ({ id: memoryDoc.id, ...memoryDoc.data() }))
        .sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));
    } catch (e) {
      console.warn('Firebase getMemories warning:', e);
      return null;
    }
  },

  async saveMemory(memory) {
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    const content = typeof memory?.content === 'string' ? memory.content.trim() : '';
    if (!uid || !content) return false;

    try {
      const memoriesRef = collection(db, 'users', uid, 'memories');
      const duplicates = await getDocs(query(memoriesRef, where('content', '==', content)));
      const existing = duplicates.docs[0];
      const memoryId = existing ? existing.id : (memory.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      const now = Date.now() / 1000;
      await setDoc(doc(db, 'users', uid, 'memories', memoryId), {
        id: memoryId,
        category: memory.category || 'preference',
        content,
        keywords: memory.keywords || '',
        created_at: existing ? (existing.data().created_at || now) : (memory.created_at || now),
        updated_at: now
      }, { merge: true });
      return memoryId;
    } catch (e) {
      console.warn('Firebase saveMemory warning:', e);
      return false;
    }
  },

  async deleteMemory(memoryId) {
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid || !memoryId) return false;
    try {
      await deleteDoc(doc(db, 'users', uid, 'memories', memoryId));
      return true;
    } catch (e) {
      console.warn('Firebase deleteMemory warning:', e);
      return false;
    }
  },

  async clearMemories() {
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return false;
    try {
      const snapshot = await getDocs(collection(db, 'users', uid, 'memories'));
      await Promise.all(snapshot.docs.map((memoryDoc) => deleteDoc(memoryDoc.ref)));
      return true;
    } catch (e) {
      console.warn('Firebase clearMemories warning:', e);
      return false;
    }
  },

  // حفظ أو تحديث محادثة كاملة مع رسائلها في Firestore
  async saveConversation(conv) {
    if (!conv || !conv.id) return;
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return;

    try {
      const convRef = doc(db, 'users', uid, 'conversations', conv.id);
      const dataToSave = {
        id: conv.id,
        title: conv.title || 'محادثة دراسية',
        created_at: conv.created_at || (Date.now() / 1000),
        updated_at: conv.updated_at || (Date.now() / 1000),
        model: conv.model || 'gemini-1.5-flash',
        pinned: !!conv.pinned,
        archived: !!conv.archived,
        messages: Array.isArray(conv.messages) ? conv.messages : []
      };

      await setDoc(convRef, dataToSave, { merge: true });

      // نسخة احتياطية في Realtime Database
      if (rtdb) {
        set(ref(rtdb, `users/${uid}/conversations/${conv.id}`), dataToSave).catch(() => {});
      }
    } catch (e) {
      console.error('Firebase saveConversation error:', e);
    }
  },

  // تحديث حقول معينة في محادثة (مثل: تثبيت، أرشفة، إعادة تسمية)
  async updateConversation(convId, updates) {
    if (!convId || !updates) return;
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return;

    try {
      const convRef = doc(db, 'users', uid, 'conversations', convId);
      await updateDoc(convRef, {
        ...updates,
        updated_at: Date.now() / 1000
      });

      if (rtdb) {
        update(ref(rtdb, `users/${uid}/conversations/${convId}`), updates).catch(() => {});
      }
    } catch (e) {
      console.warn('Firebase updateConversation error:', e);
    }
  },

  // حذف محادثة نهائياً من Firestore
  async deleteConversation(convId) {
    if (!convId) return;
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return;

    try {
      const convRef = doc(db, 'users', uid, 'conversations', convId);
      await deleteDoc(convRef);

      if (rtdb) {
        remove(ref(rtdb, `users/${uid}/conversations/${convId}`)).catch(() => {});
      }
    } catch (e) {
      console.warn('Firebase deleteConversation error:', e);
    }
  },

  // جلب محادثة محددة من Firestore
  async getConversation(convId) {
    if (!convId) return null;
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return null;

    try {
      const convRef = doc(db, 'users', uid, 'conversations', convId);
      const snap = await getDoc(convRef);
      if (snap.exists()) {
        return snap.data();
      }
    } catch (e) {
      console.warn('Firebase getConversation error:', e);
    }
    return null;
  },

  // جلب كافة المحادثات من Firestore
  async getAllConversations() {
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return [];

    try {
      const colRef = collection(db, 'users', uid, 'conversations');
      const snaps = await getDocs(colRef);
      const list = [];
      snaps.forEach(docSnap => {
        list.push(docSnap.data());
      });
      // ترتيب تنازلي حسب تاريخ التحديث مع أولوية المثبت
      list.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.updated_at || 0) - (a.updated_at || 0);
      });
      return list;
    } catch (e) {
      console.warn('Firebase getAllConversations error:', e);
      return [];
    }
  },

  // إعداد مستمع التحديثات الحية للمحادثات (Realtime Listener)
  _setupConversationsRealtimeListener() {
    const uid = this.currentUser ? this.currentUser.uid : (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return;

    if (this._conversationsUnsubscribe) {
      this._conversationsUnsubscribe();
      this._conversationsUnsubscribe = null;
    }

    try {
      const colRef = collection(db, 'users', uid, 'conversations');
      this._conversationsUnsubscribe = onSnapshot(colRef, (snapshot) => {
        const conversations = [];
        snapshot.forEach(d => {
          conversations.push(d.data());
        });

        // ترتيب: المثبت أولاً ثم الأحدث
        conversations.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return (b.updated_at || 0) - (a.updated_at || 0);
        });

        this._notifyConversations(conversations);
      }, (error) => {
        console.warn('Conversations snapshot listener error:', error);
      });
    } catch (e) {
      console.warn('Failed to attach realtime snapshot listener:', e);
    }
  }
};

// الاستماع المباشر لتغير حالة مصادقة Firebase
onAuthStateChanged(auth, (user) => {
  window.LeoFirebase.isReady = true;
  window.LeoFirebase._notifyAuth(user);
  if (user) {
    window.LeoFirebase._setupConversationsRealtimeListener();
  }
});
