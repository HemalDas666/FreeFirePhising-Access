// ==================== FIREBASE CONFIGURATION ====================
// YOU MUST REPLACE THIS WITH YOUR ACTUAL FIREBASE CONFIG
// Get this from: Firebase Console → Project Settings → Your Apps
const firebaseConfig = {
    apiKey: "AIzaSyDnYIg3S0Y8lRLWcPwrqC1w-jCPGVPj8vI",
    authDomain: "freefire-india-c022a.firebaseapp.com",
    databaseURL: "https://freefire-india-c022a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "freefire-india-c022a",
    storageBucket: "freefire-india-c022a.firebasestorage.app",
    messagingSenderId: "453909911508",
    appId: "1:453909911508:web:20bfccb9f36f49b19fa841"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let selectedLoginProvider = '';
let selectedSignupProvider = '';

// DOM Elements
const modal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const userProfile = document.getElementById('userProfile');
const displayUsername = document.getElementById('displayUsername');
const displayFFID = document.getElementById('displayFFID');
const mobileMenu = document.getElementById('mobileMenu');

// Check if user is logged in from session
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    }
    loadCategories();
    loadSkins();
    loadEvents();
    loadLeaderboard();
    setActiveNav();
    
    setTimeout(() => {
        loadSkins();
    }, 500);
});

// ==================== MODAL FUNCTIONS ====================
function showModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    resetForms();
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function resetForms() {
    document.getElementById('loginCredentials').style.display = 'none';
    document.getElementById('signupCredentials').style.display = 'none';
    document.getElementById('ffNameDisplay').style.display = 'none';
}

function switchTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active-form');
        signupForm.classList.remove('active-form');
        document.getElementById('loginCredentials').style.display = 'none';
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active-form');
        loginForm.classList.remove('active-form');
        resetForms();
    }
}

// Select Login Provider
function selectLoginProvider(provider) {
    selectedLoginProvider = provider;
    const loginCredentials = document.getElementById('loginCredentials');
    loginCredentials.style.display = 'block';
    
    const emailInput = document.getElementById('loginEmail');
    if (provider === 'google') {
        emailInput.placeholder = 'Your Gmail Address';
    } else if (provider === 'facebook') {
        emailInput.placeholder = 'Your Facebook Email';
    } else {
        emailInput.placeholder = 'Your Garena ID';
    }
}

// Select Signup Provider
function selectSignupProvider(provider) {
    selectedSignupProvider = provider;
    const signupCredentials = document.getElementById('signupCredentials');
    signupCredentials.style.display = 'block';
    
    const emailInput = document.getElementById('signupEmail');
    if (provider === 'google') {
        emailInput.placeholder = 'Your Gmail Address';
    } else if (provider === 'facebook') {
        emailInput.placeholder = 'Your Facebook Email';
    } else {
        emailInput.placeholder = 'Your Garena ID';
    }
}

// ==================== FETCH FF NAME ====================
async function fetchFFName() {
    const ffid = document.getElementById('signupFFID').value.trim();
    const ffNameDisplay = document.getElementById('ffNameDisplay');
    const ffNameInput = document.getElementById('ffName');
    
    if (!ffid || ffid.length < 5 || ffid.length > 12) {
        showNotification('Please enter a valid FF ID (8-10 digits)', 'error');
        return;
    }
    
    ffNameDisplay.style.display = 'block';
    ffNameInput.value = 'Fetching...';
    ffNameInput.readOnly = true;
    
    try {
        let ffName = null;
        
        // Try Garena API
        try {
            const response = await fetch(`https://ff.garena.com/api/antiban?uid=${ffid}`);
            const data = await response.json();
            if (data && data.name) ffName = data.name;
        } catch (e) {}
        
        // Try alternative API
        if (!ffName) {
            try {
                const response = await fetch(`https://freefireapi.com/api/player/${ffid}`);
                const data = await response.json();
                if (data && data.nickname) ffName = data.nickname;
            } catch (e) {}
        }
        
        if (ffName) {
            ffNameInput.value = ffName;
            ffNameInput.readOnly = true;
            showNotification(`✅ Found: ${ffName}`, 'success');
        } else {
            ffNameInput.value = '';
            ffNameInput.placeholder = 'Enter your FF name manually';
            ffNameInput.readOnly = false;
            showNotification('Please enter your Free Fire name manually', 'info');
        }
    } catch (error) {
        ffNameInput.value = '';
        ffNameInput.placeholder = 'Enter your FF name manually';
        ffNameInput.readOnly = false;
        showNotification('Error fetching name. Enter manually', 'info');
    }
}

// ==================== HANDLE SIGNUP (Save to Firebase) ====================
async function handleSignup(event) {
    event.preventDefault();
    
    const websiteName = document.getElementById('signupWebsiteName').value;
    const ffid = document.getElementById('signupFFID').value;
    const ffNameInput = document.getElementById('ffName');
    let ffName = ffNameInput.value;
    
    if (!ffName || ffName === 'Fetching...' || ffName.includes('Fetching')) {
        showNotification('Please fetch your Free Fire name or enter it manually', 'error');
        ffNameInput.focus();
        return;
    }
    
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!selectedSignupProvider) {
        showNotification('Please select a signup provider', 'error');
        return;
    }
    
    if (!websiteName || !ffid || !email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        // Check if email exists in Firebase
        const emailSnapshot = await database.ref('users')
            .orderByChild('email')
            .equalTo(email)
            .once('value');
        
        if (emailSnapshot.exists()) {
            showNotification('Email already registered!', 'error');
            return;
        }
        
        // Check if FFID exists
        const ffidSnapshot = await database.ref('users')
            .orderByChild('ffid')
            .equalTo(ffid)
            .once('value');
        
        if (ffidSnapshot.exists()) {
            showNotification('Free Fire ID already registered!', 'error');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            websiteName: websiteName,
            ffid: ffid,
            ffName: ffName,
            email: email,
            password: password,
            provider: selectedSignupProvider,
            avatar: 'https://i.postimg.cc/7Yz0V0Z0/ff-bg.jpg',
            level: 1,
            skins: [],
            diamonds: 100,
            joinDate: new Date().toISOString()
        };
        
        // Save to Firebase
        await database.ref('users/' + newUser.id).set(newUser);
        
        showNotification('Account created successfully! Please login.', 'success');
        switchTab('login');
        event.target.reset();
        document.getElementById('ffNameDisplay').style.display = 'none';
        
    } catch (error) {
        console.error("Signup error:", error);
        showNotification('Error creating account. Please try again.', 'error');
    }
}

// ==================== HANDLE LOGIN (Check Firebase) ====================
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!selectedLoginProvider) {
        showNotification('Please select a login provider', 'error');
        return;
    }
    
    try {
        // Find user in Firebase
        const snapshot = await database.ref('users')
            .orderByChild('email')
            .equalTo(email)
            .once('value');
        
        if (snapshot.exists()) {
            let user = null;
            snapshot.forEach(child => {
                const userData = child.val();
                if (userData.password === password && userData.provider === selectedLoginProvider) {
                    user = userData;
                }
            });
            
            if (user) {
                currentUser = user;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                showNotification(`Welcome ${user.websiteName}!`, 'success');
                closeModal();
                updateUIForLoggedInUser();
                document.getElementById('loginEmail').value = '';
                document.getElementById('loginPassword').value = '';
            } else {
                showNotification('Invalid password or provider mismatch!', 'error');
            }
        } else {
            showNotification('No account found with this email!', 'error');
        }
    } catch (error) {
        console.error("Login error:", error);
        showNotification('Error logging in. Please try again.', 'error');
    }
}

// Guest Login
function guestLogin() {
    currentUser = {
        id: 'guest_' + Date.now(),
        websiteName: 'Guest Player',
        ffName: 'Guest',
        ffid: 'GUEST',
        email: 'guest@example.com',
        provider: 'guest',
        isGuest: true,
        level: 1,
        skins: [],
        diamonds: 0
    };
    
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showNotification('Logged in as Guest!', 'info');
    closeModal();
    updateUIForLoggedInUser();
}

// Logout
function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    updateUIForLoggedOutUser();
    showNotification('Logged out successfully!', 'info');
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    loginBtn.style.display = 'none';
    userProfile.style.display = 'flex';
    
    displayUsername.innerHTML = currentUser.ffName || currentUser.websiteName;
    displayFFID.textContent = `ID: ${currentUser.ffid} | ${currentUser.provider}`;
    
    const profilePic = document.querySelector('.profile-pic');
    if (profilePic) {
        profilePic.style.borderRadius = '50%';
        profilePic.style.objectFit = 'cover';
    }
    
    const mobileLoginBtn = document.querySelector('.mobile-login-btn');
    if (mobileLoginBtn) {
        mobileLoginBtn.innerHTML = '<i class="fas fa-user"></i> ' + (currentUser.ffName || currentUser.websiteName);
        mobileLoginBtn.onclick = () => {
            closeMenu();
            viewProfile();
        };
    }
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    loginBtn.style.display = 'flex';
    userProfile.style.display = 'none';
    
    const mobileLoginBtn = document.querySelector('.mobile-login-btn');
    if (mobileLoginBtn) {
        mobileLoginBtn.innerHTML = '<i class="fas fa-user"></i> Login / Sign Up';
        mobileLoginBtn.onclick = () => {
            closeMenu();
            showModal();
        };
    }
}

// Show Notification
function showNotification(message, type) {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#00c851' : type === 'error' ? '#ff4444' : '#33b5e5'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 1rem;
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Profile Functions
function viewProfile() {
    showNotification(`
        👤 Website: ${currentUser.websiteName}
        🎮 FF Name: ${currentUser.ffName}
        🆔 FF ID: ${currentUser.ffid}
        📧 ${currentUser.provider}: ${currentUser.email}
        ⭐ Level: ${currentUser.level}
        💎 Diamonds: ${currentUser.diamonds}
    `, 'info');
}

function mySkins() {
    if (!currentUser.skins || currentUser.skins.length === 0) {
        alert('You have no skins yet!');
    } else {
        alert('Your Skins: ' + currentUser.skins.join(', '));
    }
}

// Mobile Menu Functions
function toggleMenu() {
    mobileMenu.classList.toggle('active');
}

function closeMenu() {
    mobileMenu.classList.remove('active');
}

function scrollToSkins() {
    document.getElementById('skins').scrollIntoView({ behavior: 'smooth' });
    closeMenu();
}

function settings() {
    alert('Settings coming soon!');
}

function forgotPassword() {
    alert('Contact support to reset password.');
}

// ==================== SKIN DATA ====================
const gunSkins = [
    { id: 1, name: "Blue Flame Draco", gun: "AK47", rarity: "Legendary", image: "https://i.postimg.cc/8cqbLj8C/evoak47.jpg", category: "Assault Rifles", price: "Click To Claim", isNew: true },
    { id: 2, name: "Scorpio Shatter", gun: "M1014", rarity: "Legendary", image: "https://i.postimg.cc/vTpv5cRT/evom10.jpg", category: "Shotguns", price: "Click To Claim", isNew: true },
    { id: 3, name: "Cobra MP40", gun: "MP40", rarity: "Legendary", image: "https://i.postimg.cc/Vv3FXdyS/mp40evo.jpg", category: "smg", price: "Click To Claim", isNew: false },
    { id: 4, name: "Megalodon Alpha", gun: "SCAR", rarity: "Mythic", image: "https://i.postimg.cc/T1Zcnp8W/scarevo.jpg", category: "Assault Rifles", price: "Click To Claim", isNew: true },
    { id: 5, name: "Booyah Day", gun: "UMP", rarity: "Epic", image: "https://i.postimg.cc/p5J8HVLP/UMPevo.jpg", category: "smg", price: "Click To Claim", isNew: true },
    { id: 6, name: "Infernal Draco", gun: "M4A1", rarity: "Mythic", image: "https://i.postimg.cc/xN3H2j12/m4a1evo.jpg", category: "Assault Rifles", price: "Click To Claim", isNew: true },
    { id: 7, name: "Ultimate Achiever", gun: "G18", rarity: "Legendary", image: "https://i.postimg.cc/YLzgH2Cw/g18evo.jpg", category: "Pistols", price: "Click To Claim", isNew: true }
];

const categories = [
    { id: 1, name: "Assault Rifles", icon: "fa-gun", count: 15 },
    { id: 2, name: "SMG", icon: "fa-bolt", count: 12 },
    { id: 3, name: "Shotguns", icon: "fa-crosshairs", count: 8 },
    { id: 4, name: "Snipers", icon: "fa-eye", count: 10 },
    { id: 5, name: "Pistols", icon: "fa-hand", count: 6 },
    { id: 6, name: "Melee", icon: "fa-knife", count: 9 }
];

const events = [
    { id: 1, title: "🇮🇳 Independence Day Special", description: "Get exclusive Tricolor skins!", timeLeft: "5 days left", reward: "Free India Skin Crate", isActive: true },
    { id: 2, title: "Diwali Dhamaka", description: "Double diamonds!", timeLeft: "10 days left", reward: "2x Diamond Bonus", isActive: true },
    { id: 3, title: "Weekend Tournament", description: "Win exclusive skins!", timeLeft: "2 days left", reward: "Legendary Skin", isActive: true },
    { id: 4, title: "New Player Bonus", description: "First login gets free skin!", timeLeft: "Always Active", reward: "Free Epic Skin", isActive: true }
];

const leaderboard = [
    { rank: 1, name: "ProGamer_IND", level: 85, score: 25430, avatar: "https://i.postimg.cc/7Yz0V0Z0/ff-bg.jpg" },
    { rank: 2, name: "FreeFireKing", level: 82, score: 23890, avatar: "https://i.postimg.cc/7Yz0V0Z0/ff-bg.jpg" },
    { rank: 3, name: "HeadshotMaster", level: 80, score: 22150, avatar: "https://i.postimg.cc/7Yz0V0Z0/ff-bg.jpg" },
    { rank: 4, name: "DragonSlayer", level: 78, score: 19870, avatar: "https://i.postimg.cc/7Yz0V0Z0/ff-bg.jpg" },
    { rank: 5, name: "IndiaNo1", level: 75, score: 18540, avatar: "https://i.postimg.cc/7Yz0V0Z0/ff-bg.jpg" }
];

// Load Categories
function loadCategories() {
    const categoryGrid = document.getElementById('categoryGrid');
    if (!categoryGrid) return;
    categoryGrid.innerHTML = '';
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => filterByCategory(cat.name);
        card.innerHTML = `
            <i class="fas ${cat.icon} category-icon"></i>
            <h3 class="category-name">${cat.name}</h3>
            <p style="font-size: 12px; color: #ff4400;">${cat.count} skins</p>
        `;
        categoryGrid.appendChild(card);
    });
}

// Load Gun Skins
function loadSkins(filterCategory = 'all') {
    const skinsGrid = document.getElementById('skinsGrid');
    if (!skinsGrid) return;
    skinsGrid.innerHTML = '';
    
    let filteredSkins = gunSkins;
    if (filterCategory !== 'all') {
        filteredSkins = gunSkins.filter(skin => 
            skin.category.toLowerCase().includes(filterCategory.toLowerCase())
        );
    }
    
    filteredSkins.forEach(skin => {
        const card = document.createElement('div');
        card.className = 'skin-card';
        if (skin.isNew) card.setAttribute('data-new', 'true');
        card.innerHTML = `
            <img src="${skin.image}" alt="${skin.name}" class="skin-image" onerror="this.src='https://via.placeholder.com/300x200/1a1a2e/ff4400?text=FF+India'">
            <div class="skin-info">
                <h3 class="skin-name">${skin.name}</h3>
                <p class="skin-gun">${skin.gun}</p>
                <span class="skin-rarity">${skin.rarity}</span>
                <p style="color: gold; margin-top: 5px;">💰 ${skin.price} 💎</p>
            </div>
        `;
        card.onclick = () => buySkin(skin);
        skinsGrid.appendChild(card);
    });
}

// Load Events
function loadEvents() {
    const eventsContainer = document.getElementById('eventsContainer');
    if (!eventsContainer) return;
    eventsContainer.innerHTML = '';
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <h3 class="event-title">${event.title}</h3>
            <p class="event-desc">${event.description}</p>
            <div class="event-timer"><i class="fas fa-clock"></i> <span>${event.timeLeft}</span></div>
            <p class="event-reward"><i class="fas fa-gift"></i> ${event.reward}</p>
        `;
        card.onclick = () => joinEvent(event);
        eventsContainer.appendChild(card);
    });
}

// Load Leaderboard
function loadLeaderboard() {
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    if (!leaderboardContainer) return;
    leaderboardContainer.innerHTML = '';
    leaderboard.forEach(player => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span class="leaderboard-rank">#${player.rank}</span>
            <img src="${player.avatar}" alt="${player.name}" class="leaderboard-avatar">
            <div class="leaderboard-info">
                <div class="leaderboard-name">${player.name}</div>
                <div class="leaderboard-level">Level ${player.level}</div>
            </div>
            <div class="leaderboard-score">${player.score.toLocaleString()}</div>
        `;
        leaderboardContainer.appendChild(item);
    });
}

// Buy Skin Function
function buySkin(skin) {
    if (!currentUser) {
        showNotification('Please login first!', 'error');
        showModal();
        return;
    }
    if (currentUser.isGuest) {
        showNotification('Guests cannot claim skins!', 'error');
        return;
    }
    if (!currentUser.skins) currentUser.skins = [];
    if (currentUser.skins.includes(skin.name)) {
        showNotification('You already own this skin!', 'error');
        return;
    }
    currentUser.skins.push(skin.name);
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showNotification(`✅ Claimed ${skin.name}!`, 'success');
}

// Join Event
function joinEvent(event) {
    if (!currentUser) {
        showNotification('Please login to join events!', 'error');
        showModal();
        return;
    }
    showNotification(`Joined ${event.title}!`, 'success');
}

// Filter by Category
function filterByCategory(category) {
    loadSkins(category);
    document.getElementById('skins').scrollIntoView({ behavior: 'smooth' });
}

// Handle Navigation Active State
function setActiveNav() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollY >= (sectionTop - 300)) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// Footer Functions
function faq() { alert('FAQ Section\n\nQ: How to get free skins?\nA: Participate in events!'); }
function contact() { alert('Contact: support@freefireindia.com'); }
function privacy() { alert('Privacy Policy\n\nYour data is stored securely in Firebase.'); }
function terms() { alert('Terms of Use\n\nBe respectful to other players.'); }

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .profile-pic {
        border-radius: 50% !important;
        object-fit: cover !important;
        width: 40px;
        height: 40px;
        border: 2px solid #ff4400;
    }
`;
document.head.appendChild(style);