// User Data (Local Storage)
let users = JSON.parse(localStorage.getItem('ffIndia_users')) || [];
let currentUser = JSON.parse(localStorage.getItem('ffIndia_currentUser')) || null;
let selectedLoginProvider = '';
let selectedSignupProvider = '';

// DOM Elements
const modal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const userProfile = document.getElementById('userProfile');
const displayUsername = document.getElementById('displayUsername');
const displayFFID = document.getElementById('displayFFID');
const mobileMenu = document.getElementById('mobileMenu');

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        updateUIForLoggedInUser();
    }
    loadCategories();
    loadSkins();
    loadEvents();
    loadLeaderboard();
    setActiveNav();
    
    // Add loading animation
    const skinsGrid = document.getElementById('skinsGrid');
    if (skinsGrid) {
        skinsGrid.innerHTML = '<div class="loading"></div>';
    }
    
    // Simulate loading
    setTimeout(() => {
        loadSkins();
    }, 500);
});

// Modal Functions
function showModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Reset forms
    document.getElementById('loginCredentials').style.display = 'none';
    document.getElementById('signupCredentials').style.display = 'none';
    document.getElementById('ffNameDisplay').style.display = 'none';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Switch between Login and Signup tabs
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
        document.getElementById('signupCredentials').style.display = 'none';
        document.getElementById('ffNameDisplay').style.display = 'none';
    }
}

// Select Login Provider
function selectLoginProvider(provider) {
    selectedLoginProvider = provider;
    const loginCredentials = document.getElementById('loginCredentials');
    loginCredentials.style.display = 'block';
    
    // Change placeholder based on provider
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
    
    // Change placeholder based on provider
    const emailInput = document.getElementById('signupEmail');
    if (provider === 'google') {
        emailInput.placeholder = 'Your Gmail Address';
    } else if (provider === 'facebook') {
        emailInput.placeholder = 'Your Facebook Email';
    } else {
        emailInput.placeholder = 'Your Garena ID';
    }
}

// Fetch FF Name from ID (UPDATED - Better handling)
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
        // Try multiple APIs to fetch FF name
        let ffName = null;
        
        // API 1: Garena Anti-ban API
        try {
            const response = await fetch(`https://ff.garena.com/api/antiban?uid=${ffid}`);
            const data = await response.json();
            if (data && data.name) {
                ffName = data.name;
            }
        } catch (e) {
            console.log("API 1 failed");
        }
        
        // API 2: Alternative API
        if (!ffName) {
            try {
                const response = await fetch(`https://freefireapi.com/api/player/${ffid}`);
                const data = await response.json();
                if (data && data.nickname) {
                    ffName = data.nickname;
                }
            } catch (e) {
                console.log("API 2 failed");
            }
        }
        
        if (ffName) {
            ffNameInput.value = ffName;
            ffNameInput.readOnly = true; // Keep it readonly so they can't change it
            showNotification(`✅ Found: ${ffName}`, 'success');
        } else {
            ffNameInput.value = '';
            ffNameInput.placeholder = 'Enter your FF name manually';
            ffNameInput.readOnly = false; // Allow manual entry if fetch fails
            showNotification('Could not fetch name. Please enter your Free Fire name manually', 'info');
        }
    } catch (error) {
        ffNameInput.value = '';
        ffNameInput.placeholder = 'Enter your FF name manually';
        ffNameInput.readOnly = false;
        showNotification('Error fetching name. Please enter your Free Fire name manually', 'info');
    }
}

// Handle Login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!selectedLoginProvider) {
        showNotification('Please select a login provider (Gmail/Facebook/Garena)', 'error');
        return;
    }
    
    // Find user with matching credentials and provider
    const user = users.find(u => 
        u.email === email && 
        u.password === password && 
        u.provider === selectedLoginProvider
    );
    
    if (user) {
        currentUser = user;
        localStorage.setItem('ffIndia_currentUser', JSON.stringify(user));
        
        showNotification(`Login Successful! Welcome ${user.websiteName}`, 'success');
        
        closeModal();
        updateUIForLoggedInUser();
        
        // Clear login form
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    } else {
        showNotification('Invalid credentials or no account found with this provider!', 'error');
    }
}

// Handle Signup (UPDATED - Fixed FF Name Display)
function handleSignup(event) {
    event.preventDefault();
    
    const websiteName = document.getElementById('signupWebsiteName').value;
    const ffid = document.getElementById('signupFFID').value;
    const ffNameInput = document.getElementById('ffName');
    let ffName = ffNameInput.value;
    
    // IMPORTANT: Don't generate auto names - require real FF name
    if (!ffName || ffName === 'Fetching...' || ffName.includes('Fetching')) {
        showNotification('Please fetch your Free Fire name or enter it manually', 'error');
        ffNameInput.focus();
        ffNameInput.readOnly = false;
        ffNameInput.placeholder = 'Enter your FF name';
        return;
    }
    
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    // Validation
    if (!selectedSignupProvider) {
        showNotification('Please select a signup provider (Gmail/Facebook/Garena)', 'error');
        return;
    }
    
    if (!websiteName || !ffid || !email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters!', 'error');
        return;
    }
    
    // Check if user exists
    if (users.some(u => u.email === email)) {
        showNotification('Email already registered!', 'error');
        return;
    }
    
    if (users.some(u => u.ffid === ffid)) {
        showNotification('Free Fire ID already registered!', 'error');
        return;
    }
    
    // Create new user with proper FF name
    const newUser = {
        id: Date.now(),
        websiteName: websiteName,
        ffid: ffid,
        ffName: ffName, // Use the fetched/entered name directly (NO auto-generation)
        email: email,
        password: password,
        provider: selectedSignupProvider,
        avatar: 'https://i.postimg.cc/7Yz0V0Z0/ff-bg.jpg',
        level: 1,
        skins: [],
        diamonds: 100,
        joinDate: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('ffIndia_users', JSON.stringify(users));
    
    showNotification('Account created successfully! Please login.', 'success');
    
    // Switch to login tab
    switchTab('login');
    event.target.reset();
    document.getElementById('ffNameDisplay').style.display = 'none';
}

// Guest Login
function guestLogin() {
    const guestUser = {
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
    
    currentUser = guestUser;
    localStorage.setItem('ffIndia_currentUser', JSON.stringify(guestUser));
    
    showNotification('Logged in as Guest! Create an account to save your progress.', 'info');
    
    closeModal();
    updateUIForLoggedInUser();
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('ffIndia_currentUser');
    
    updateUIForLoggedOutUser();
    showNotification('Logged out successfully!', 'info');
    
    // Refresh the page content
    loadSkins();
}

// Update UI for logged in user (UPDATED - Better profile display)
function updateUIForLoggedInUser() {
    loginBtn.style.display = 'none';
    userProfile.style.display = 'flex';
    
    // Show FF name prominently (first word should be the name)
    displayUsername.innerHTML = currentUser.ffName || currentUser.websiteName;
    
    // Show FF ID and provider below
    displayFFID.textContent = `ID: ${currentUser.ffid} | ${currentUser.provider}`;
    
    // Make sure profile picture is circular (already handled by CSS)
    const profilePic = document.querySelector('.profile-pic');
    if (profilePic) {
        profilePic.style.borderRadius = '50%';
        profilePic.style.objectFit = 'cover';
    }
    
    // Update mobile menu
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
    
    // Reset mobile menu
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
    // Remove any existing notifications
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
        setTimeout(() => {
            notification.remove();
        }, 300);
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
        alert('You have no skins yet! Visit the shop to get some.');
    } else {
        alert('Your Skins: ' + currentUser.skins.join(', '));
    }
}

function settings() {
    alert('Settings panel will be available soon!');
}

function forgotPassword() {
    alert('Please contact support at support@freefireindia.com');
}

// Mobile Menu Toggle
function toggleMenu() {
    mobileMenu.classList.toggle('active');
}

function closeMenu() {
    mobileMenu.classList.remove('active');
}

// Scroll to Skins Section
function scrollToSkins() {
    document.getElementById('skins').scrollIntoView({ behavior: 'smooth' });
    closeMenu();
}

// Gun Skins Data
const gunSkins = [
    {
        id: 1,
        name: "Blue Flame Draco",
        gun: "AK47",
        rarity: "Legendary",
        image: "https://i.postimg.cc/8cqbLj8C/evoak47.jpg",
        category: "Assault Rifles",
        price: "Click To Claim",
        isNew: true
    },
    {
        id: 2,
        name: "Scorpio Shatter",
        gun: "M1014",
        rarity: "Legendary",
        image: "https://i.postimg.cc/vTpv5cRT/evom10.jpg",
        category: "Shotguns",
        price: "Click To Claim",
        isNew: true
    },
    {
        id: 3,
        name: "Cobra MP40",
        gun: "MP40",
        rarity: "Legendary",
        image: "https://i.postimg.cc/Vv3FXdyS/mp40evo.jpg",
        category: "smg",
        price: "Click To Claim",
        isNew: false
    },
    {
        id: 4,
        name: "Megalodon Alpha",
        gun: "SCAR",
        rarity: "Mythic",
        image: "https://i.postimg.cc/T1Zcnp8W/scarevo.jpg",
        category: "Assault Rifles",
        price: "Click To Claim",
        isNew: true
    },
    {
        id: 5,
        name: "Booyah Day",
        gun: "UMP",
        rarity: "Epic",
        image: "https://i.postimg.cc/p5J8HVLP/UMPevo.jpg",
        category: "smg",
        price: "Click To Claim",
        isNew: true
    },
    {
        id: 6,
        name: "Infernal Draco",
        gun: "M4A1",
        rarity: "Mythic",
        image: "https://i.postimg.cc/xN3H2j12/m4a1evo.jpg",
        category: "Assault Rifles",
        price: "Click To Claim",
        isNew: true
    },
    {
        id: 7,
        name: "Ultimate Achiever",
        gun: "G18",
        rarity: "Legendary",
        image: "https://i.postimg.cc/YLzgH2Cw/g18evo.jpg",
        category: "Pistols",
        price: "Click To Claim",
        isNew: true
    }
];

// Categories Data
const categories = [
    { id: 1, name: "Assault Rifles", icon: "fa-gun", count: 15 },
    { id: 2, name: "SMG", icon: "fa-bolt", count: 12 },
    { id: 3, name: "Shotguns", icon: "fa-crosshairs", count: 8 },
    { id: 4, name: "Snipers", icon: "fa-eye", count: 10 },
    { id: 5, name: "Pistols", icon: "fa-hand", count: 6 },
    { id: 6, name: "Melee", icon: "fa-knife", count: 9 }
];

// Events Data
const events = [
    {
        id: 1,
        title: "🇮🇳 Independence Day Special",
        description: "Get exclusive Tricolor skins! Limited time offer.",
        timeLeft: "5 days left",
        reward: "Free India Skin Crate",
        isActive: true
    },
    {
        id: 2,
        title: "Diwali Dhamaka",
        description: "Double diamonds on all purchases!",
        timeLeft: "10 days left",
        reward: "2x Diamond Bonus",
        isActive: true
    },
    {
        id: 3,
        title: "Weekend Tournament",
        description: "Win exclusive skins by playing.",
        timeLeft: "2 days left",
        reward: "Legendary Skin Guarantee",
        isActive: true
    },
    {
        id: 4,
        title: "New Player Bonus",
        description: "First login gets free skin!",
        timeLeft: "Always Active",
        reward: "Free Epic Skin",
        isActive: true
    }
];

// Leaderboard Data
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
        if (skin.isNew) {
            card.setAttribute('data-new', 'true');
        }
        card.innerHTML = `
            <img src="${skin.image}" alt="${skin.name}" class="skin-image" 
                 onerror="this.src='https://via.placeholder.com/300x200/1a1a2e/ff4400?text=FF+India'">
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
            <div class="event-timer">
                <i class="fas fa-clock"></i>
                <span>${event.timeLeft}</span>
            </div>
            <p class="event-reward">
                <i class="fas fa-gift"></i> ${event.reward}
            </p>
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
        showNotification('Please login to purchase skins!', 'error');
        showModal();
        return;
    }
    
    if (currentUser.isGuest) {
        showNotification('Guests cannot purchase skins. Create an account!', 'error');
        return;
    }
    
    // For demo purposes, since price is "Click To Claim", we'll just claim it
    if (!currentUser.skins) currentUser.skins = [];
    
    if (currentUser.skins.includes(skin.name)) {
        showNotification('You already own this skin!', 'error');
        return;
    }
    
    currentUser.skins.push(skin.name);
    
    // Update storage
    localStorage.setItem('ffIndia_currentUser', JSON.stringify(currentUser));
    
    // Update user in users array
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('ffIndia_users', JSON.stringify(users));
    }
    
    showNotification(`✅ Successfully claimed ${skin.name}!`, 'success');
}

// Join Event
function joinEvent(event) {
    if (!currentUser) {
        showNotification('Please login to join events!', 'error');
        showModal();
        return;
    }
    
    showNotification(`Joined ${event.title}! Good luck! 🍀`, 'success');
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
            const sectionHeight = section.clientHeight;
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
function faq() {
    alert('FAQ Section\n\nQ: How to get free skins?\nA: Participate in events and tournaments!\n\nQ: Is this official?\nA: No, this is a fan-made website for Indian players.');
}

function contact() {
    alert('Contact us at: support@freefireindia.com\n📱 Instagram: @freefireindia\n💬 Discord: discord.gg/ffindia');
}

function privacy() {
    alert('Privacy Policy\n\nWe value your privacy. Your data is stored locally and never shared with third parties.');
}

function terms() {
    alert('Terms of Use\n\nBy using this website, you agree to:\n1. Be respectful to other players\n2. Not share your password\n3. Have fun playing Free Fire!');
}

// Handle window resize for ultra small devices
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    if (width <= 100) {
        document.body.style.fontSize = '8px';
    }
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    /* Ensure profile picture is circular */
    .profile-pic {
        border-radius: 50% !important;
        object-fit: cover !important;
        width: 40px;
        height: 40px;
        border: 2px solid #ff4400;
    }
`;
document.head.appendChild(style);