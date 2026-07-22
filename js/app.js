/**
 * BioCake — Application Entry Point
 * Etapa 2: Integrare catalog interactiv + coș de cumpărături.
 */

document.addEventListener('DOMContentLoaded', () => {
    initHeaderScroll();
    initMobileNav();
    initContactLinks();
    initCartUI();    // Drawer coș
    initCheckout();  // Overlay checkout (Etapa 4)
    initCatalog();   // Catalog + filtrare (async Supabase)

    // Restaurează badge-ul coșului din localStorage la reload
    updateCartBadge(getCartCount());
});

/* ── Contact din config.js ───────────────────────────── */
function initContactLinks() {
    const c = window.BIOCAKE_CONTACT;
    if (!c) return;
    const phoneLink = document.getElementById('contact-phone-link');
    if (phoneLink) {
        phoneLink.href = `tel:${c.phoneTel}`;
        phoneLink.textContent = c.phoneDisplay;
    }
}

/* ── Header scroll reactiv ───────────────────────────── */
function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                header.classList.toggle('scrolled', window.scrollY > 40);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

/* ── Mobile nav ──────────────────────────────────────── */
function initMobileNav() {
    const header    = document.getElementById('header');
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.getElementById('nav-menu');
    if (!hamburger || !navMenu) return;

    function closeNav() {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', () => {
        const isOpen = hamburger.classList.toggle('active');
        navMenu.classList.toggle('active', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeNav);
    });

    document.addEventListener('click', (e) => {
        if (header && !header.contains(e.target) && navMenu.classList.contains('active')) {
            closeNav();
        }
    });
}

/* ── Cart badge ──────────────────────────────────────── */
function updateCartBadge(count) {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}
