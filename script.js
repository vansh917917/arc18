/*
    Arc18 - Main JavaScript File
    Purpose: Handle Firebase authentication, Firestore operations, and UI interactions
    Developer: Vansh
    Tech Stack: Vanilla JS + Firebase v9+ (Modular SDK)
*/

// ========== FIREBASE IMPORTS & INITIALIZATION ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
signOut, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc,
    orderBy,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration - PASTE YOUR CONFIG HERE
const firebaseConfig = {
    apiKey: "AIzaSyD8mbZupeWkKwgCd5Hf1s-7lJqZLtDtMrA",
    authDomain: "arc18-4457a.firebaseapp.com",
    projectId: "arc18-4457a",
    storageBucket: "arc18-4457a.firebasestorage.app",
    messagingSenderId: "826484043451",
    appId: "1:826484043451:web:befed3007d38211398c39e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========== GLOBAL VARIABLES ==========
let currentUser = null;
let allNotes = [];
let editingNoteId = null;
let downloadingNoteId = null;
let unsubscribeNotes = null;

// ========== DOM ELEMENTS ==========
// Authentication elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userEmail = document.getElementById('userEmail');
const authMessage = document.getElementById('authMessage');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

// App elements
const addNoteBtn = document.getElementById('addNoteBtn');
const notesContainer = document.getElementById('notesContainer');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const downloadAllBtn = document.getElementById('downloadAllBtn');

// Modal elements
const noteModal = document.getElementById('noteModal');
const modalTitle = document.getElementById('modalTitle');
const noteTitleInput = document.getElementById('noteTitleInput');
const noteContentInput = document.getElementById('noteContentInput');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const cancelNoteBtn = document.getElementById('cancelNoteBtn');
const closeModal = document.getElementById('closeModal');

// Download modal elements
const downloadModal = document.getElementById('downloadModal');
const closeDownloadModal = document.getElementById('closeDownloadModal');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const downloadMessage = document.getElementById('downloadMessage');

// Loading and toast
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');

// ========== AUTHENTICATION FUNCTIONS ==========

// Show loading overlay
function showLoading() {
    loadingOverlay.classList.add('active');
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Show toast notification
function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Show auth message
function showAuthMessage(message, type = 'error') {
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 5000);
}

// Switch between login and signup tabs
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.style.display = 'flex';
    signupForm.style.display = 'none';
    authMessage.style.display = 'none';
});

signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.style.display = 'flex';
    loginForm.style.display = 'none';
    authMessage.style.display = 'none';
});

// Handle signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters long');
        return;
    }

    showLoading();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        showToast('Account created successfully!');
        signupForm.reset();
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Failed to create account';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        }
        showAuthMessage(errorMessage);
    } finally {
        hideLoading();
    }
});

// Handle login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    showLoading();
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Logged in successfully!');
        loginForm.reset();
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Failed to log in';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password';
        }
        showAuthMessage(errorMessage);
    } finally {
        hideLoading();
    }
});

// Handle Google login
googleLoginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    showLoading();
    try {
        await signInWithPopup(auth, provider);
        showToast('Logged in with Google successfully!');
    } catch (error) {
        console.error('Google login error:', error);
        let errorMessage = 'Failed to log in with Google';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login popup was closed';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = 'Login was cancelled';
        }
        showAuthMessage(errorMessage);
    } finally {
        hideLoading();
    }
});

// Handle forgot password
forgotPasswordBtn.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    
    if (!email) {
        showAuthMessage('Please enter your email address first');
        return;
    }

    showLoading();
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthMessage('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Failed to send reset email';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        }
        showAuthMessage(errorMessage);
    } finally {
        hideLoading();
    }
});

// Handle logout
logoutBtn.addEventListener('click', async () => {
    showLoading();
    try {
        await signOut(auth);
        showToast('Logged out successfully!');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to log out');
    } finally {
        hideLoading();
    }
});

// Monitor authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userInfo.style.display = 'flex';
        userEmail.textContent = user.email;
        loadNotes();
    } else {
        currentUser = null;
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        userInfo.style.display = 'none';
        allNotes = [];
        if (unsubscribeNotes) {
            unsubscribeNotes();
            unsubscribeNotes = null;
        }
    }
});

// ========== FIRESTORE FUNCTIONS ==========

// Load notes for current user with real-time updates
// Load notes for current user with real-time updates - UPDATED
function loadNotes() {
    if (!currentUser) return;

    showLoading();
    
    // Create query for user's notes (removed orderBy temporarily)
    const notesQuery = query(
        collection(db, 'notes'),
        where('userId', '==', currentUser.uid)
    );

    // Set up real-time listener
    unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
        allNotes = [];
        snapshot.forEach((doc) => {
            allNotes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort manually by createdAt
        allNotes.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return dateB - dateA;
        });
        
        displayNotes(allNotes);
        hideLoading();
    }, (error) => {
        console.error('Error loading notes:', error);
        console.error('Error code:', error.code);
        showToast('Failed to load notes: ' + error.message);
        hideLoading();
    });
}

// Display notes in the grid
function displayNotes(notes) {
    if (notes.length === 0) {
        emptyState.style.display = 'block';
        notesContainer.innerHTML = '';
        notesContainer.appendChild(emptyState);
        return;
    }

    emptyState.style.display = 'none';
    notesContainer.innerHTML = '';

    notes.forEach(note => {
        const noteCard = createNoteCard(note);
        notesContainer.appendChild(noteCard);
    });
}

// Create note card element
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.setAttribute('data-note-id', note.id);

    // Format timestamp
    let timestampText = 'Just now';
    if (note.createdAt && note.createdAt.toDate) {
        const date = note.createdAt.toDate();
        timestampText = formatDate(date);
    }

    card.innerHTML = `
        <div class="note-header">
            <h3 class="note-title">${escapeHtml(note.title)}</h3>
            <div class="note-actions">
                <button class="note-btn edit" title="Edit" data-action="edit">✏️</button>
                <button class="note-btn download" title="Download" data-action="download">⬇️</button>
                <button class="note-btn delete" title="Delete" data-action="delete">🗑️</button>
            </div>
        </div>
        <p class="note-content">${escapeHtml(note.content)}</p>
        <div class="note-timestamp">${timestampText}</div>
    `;

    // Add event listeners
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    const downloadBtn = card.querySelector('[data-action="download"]');

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(note);
    });

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(note.id);
    });

    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDownloadModal(note.id);
    });

    // Click on card to edit
    card.addEventListener('click', () => {
        openEditModal(note);
    });

    return card;
}

// Format date to readable string
// Format date to readable string - UPDATED
function formatDate(date) {
    // Handle both Firestore Timestamp and plain Date objects
    let actualDate;
    if (date && date.toDate) {
        actualDate = date.toDate();
    } else if (date instanceof Date) {
        actualDate = date;
    } else {
        return 'Just now';
    }

    const now = new Date();
    const diff = now - actualDate;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return actualDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add new note
// Add new note - UPDATED VERSION
async function addNote(title, content) {
    if (!currentUser) {
        showToast('Please log in first');
        return;
    }

    showLoading();
    try {
        // Use plain Date object instead of serverTimestamp initially
        const noteData = {
            userId: currentUser.uid,
            title: title,
            content: content,
            createdAt: new Date() // Changed from serverTimestamp()
        };

        console.log('Adding note:', noteData); // Debug log
        
        const docRef = await addDoc(collection(db, 'notes'), noteData);
        console.log('Note added with ID:', docRef.id); // Debug log
        
        showToast('Note added successfully!');
        closeNoteModal();
    } catch (error) {
        console.error('Error adding note:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        showToast('Failed to add note: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Update existing note
async function updateNote(noteId, title, content) {
    if (!currentUser) return;

    showLoading();
    try {
        const noteRef = doc(db, 'notes', noteId);
        await updateDoc(noteRef, {
            title: title,
            content: content
        });
        showToast('Note updated successfully!');
        closeNoteModal();
    } catch (error) {
        console.error('Error updating note:', error);
        showToast('Failed to update note');
    } finally {
        hideLoading();
    }
}

// Delete note
async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    showLoading();
    try {
        await deleteDoc(doc(db, 'notes', noteId));
        showToast('Note deleted successfully!');
    } catch (error) {
        console.error('Error deleting note:', error);
        showToast('Failed to delete note');
    } finally {
        hideLoading();
    }
}

// ========== MODAL FUNCTIONS ==========

// Open add note modal
addNoteBtn.addEventListener('click', () => {
    editingNoteId = null;
    modalTitle.textContent = 'New Note';
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteModal.classList.add('active');
    noteTitleInput.focus();
});

// Open edit modal
function openEditModal(note) {
    editingNoteId = note.id;
    modalTitle.textContent = 'Edit Note';
    noteTitleInput.value = note.title;
    noteContentInput.value = note.content;
    noteModal.classList.add('active');
    noteTitleInput.focus();
}

// Close note modal
function closeNoteModal() {
    noteModal.classList.remove('active');
    editingNoteId = null;
    noteTitleInput.value = '';
    noteContentInput.value = '';
}

closeModal.addEventListener('click', closeNoteModal);
cancelNoteBtn.addEventListener('click', closeNoteModal);

// Close modal when clicking outside
noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) {
        closeNoteModal();
    }
});

// Save note
saveNoteBtn.addEventListener('click', async () => {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();

    if (!title) {
        showToast('Please enter a title');
        noteTitleInput.focus();
        return;
    }

    if (!content) {
        showToast('Please enter some content');
        noteContentInput.focus();
        return;
    }

    if (editingNoteId) {
        await updateNote(editingNoteId, title, content);
    } else {
        await addNote(title, content);
    }
});

// ========== SEARCH FUNCTIONALITY ==========

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayNotes(allNotes);
        return;
    }

    const filteredNotes = allNotes.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(searchTerm);
        const contentMatch = note.content.toLowerCase().includes(searchTerm);
        return titleMatch || contentMatch;
    });

    displayNotes(filteredNotes);
});

// ========== DOWNLOAD FUNCTIONS ==========

// Open download modal for single note
function openDownloadModal(noteId) {
    downloadingNoteId = noteId;
    downloadMessage.textContent = 'Download this note as:';
    downloadModal.classList.add('active');
}

// Open download modal for all notes
downloadAllBtn.addEventListener('click', () => {
    if (allNotes.length === 0) {
        showToast('No notes to download');
        return;
    }
    downloadingNoteId = null;
    downloadMessage.textContent = 'Download all notes as:';
    downloadModal.classList.add('active');
});

// Close download modal
closeDownloadModal.addEventListener('click', () => {
    downloadModal.classList.remove('active');
    downloadingNoteId = null;
});

downloadModal.addEventListener('click', (e) => {
    if (e.target === downloadModal) {
        downloadModal.classList.remove('active');
        downloadingNoteId = null;
    }
});

// Download as TXT
downloadTxtBtn.addEventListener('click', () => {
    if (downloadingNoteId) {
        downloadSingleNoteAsTxt(downloadingNoteId);
    } else {
        downloadAllNotesAsTxt();
    }
    downloadModal.classList.remove('active');
});

// Download as PDF
downloadPdfBtn.addEventListener('click', () => {
    if (downloadingNoteId) {
        downloadSingleNoteAsPdf(downloadingNoteId);
    } else {
        downloadAllNotesAsPdf();
    }
    downloadModal.classList.remove('active');
});

// Download single note as TXT
function downloadSingleNoteAsTxt(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    const content = `${note.title}\n\n${note.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(note.title)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Note downloaded as TXT!');
}

// Download all notes as TXT
function downloadAllNotesAsTxt() {
    let content = '';
    allNotes.forEach((note, index) => {
        content += `${note.title}\n\n${note.content}`;
        if (index < allNotes.length - 1) {
            content += '\n\n' + '='.repeat(50) + '\n\n';
        }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arc18_Notes_${getDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('All notes downloaded as TXT!');
}

// Download single note as PDF
function downloadSingleNoteAsPdf(noteId) {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    const content = generatePdfHtml([note]);
    printPdf(content, `${sanitizeFilename(note.title)}.pdf`);
    showToast('Note downloaded as PDF!');
}

// Download all notes as PDF
function downloadAllNotesAsPdf() {
    const content = generatePdfHtml(allNotes);
    printPdf(content, `arc18_Notes_${getDateString()}.pdf`);
    showToast('All notes downloaded as PDF!');
}

// Generate HTML for PDF
function generatePdfHtml(notes) {
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                h1 {
                    color: #667eea;
                    border-bottom: 3px solid #667eea;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                }
                .note {
                    margin-bottom: 40px;
                    page-break-inside: avoid;
                }
                .note-title {
                    font-size: 24px;
                    color: #333;
                    margin-bottom: 10px;
                }
                .note-content {
                    color: #555;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                .separator {
                    border-top: 1px solid #ddd;
                    margin: 30px 0;
                }
            </style>
        </head>
        <body>
            <h1>arc18 Notes</h1>
    `;

    notes.forEach((note, index) => {
        html += `
            <div class="note">
                <h2 class="note-title">${escapeHtml(note.title)}</h2>
                <p class="note-content">${escapeHtml(note.content)}</p>
            </div>
        `;
        if (index < notes.length - 1) {
            html += '<div class="separator"></div>';
        }
    });

    html += `
        </body>
        </html>
    `;

    return html;
}

// Print PDF using browser's print dialog
function printPdf(htmlContent, filename) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
}

// Sanitize filename
function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}

// Get date string for filename
function getDateString() {
    const now = new Date();
    return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}`;
}

// ========== KEYBOARD SHORTCUTS ==========

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (noteModal.classList.contains('active')) {
            closeNoteModal();
        }
        if (downloadModal.classList.contains('active')) {
            downloadModal.classList.remove('active');
            downloadingNoteId = null;
        }
    }
});

// Save note with Ctrl/Cmd + Enter
noteTitleInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        saveNoteBtn.click();
    }
});

noteContentInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        saveNoteBtn.click();
    }
});