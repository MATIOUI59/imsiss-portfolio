// Mobile hamburger menu
const mobileMenuIcon = document.getElementById('mobileMenuIcon');
const navMenu = document.querySelector('.nav-menu');

function closeMobileMenu() {
    if (!navMenu) return;
    navMenu.classList.remove('mobile-open');
    if (mobileMenuIcon) mobileMenuIcon.setAttribute('aria-expanded', 'false');
}

if (mobileMenuIcon && navMenu) {
    mobileMenuIcon.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('mobile-open');
        mobileMenuIcon.setAttribute('aria-expanded', String(isOpen));
    });
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        closeMobileMenu();
    });
});

// Intersection Observer for scroll animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show-section');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.hidden-section').forEach(section => {
    observer.observe(section);
});

// Active nav link based on scroll position
const navLinks = document.querySelectorAll('.nav-menu a');
const observedSections = document.querySelectorAll('section[id]');

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}, {
    rootMargin: '-50% 0px -50% 0px'
});

observedSections.forEach(section => {
    navObserver.observe(section);
});

// Navbar shadow on scroll (rAF-throttled, only touches style on state
// change, so it never adds work to every scroll frame)
const navbar = document.querySelector('.navbar');
let navbarScrolled = false;
let scrollTicking = false;

function updateNavbarShadow() {
    const shouldShow = window.pageYOffset > 100;
    if (shouldShow !== navbarScrolled) {
        navbarScrolled = shouldShow;
        if (navbar) navbar.classList.toggle('navbar-scrolled', shouldShow);
    }
    scrollTicking = false;
}

window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        requestAnimationFrame(updateNavbarShadow);
        scrollTicking = true;
    }
}, { passive: true });

console.log('Portfolio loaded — Mouad Matioui');
