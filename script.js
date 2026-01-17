// Observador de intersección para animaciones fade-in
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in, .fade-in-delay').forEach(el => {
    observer.observe(el);
});

// Manejo del scroll para el header
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(51, 51, 51, 0.9)';
        header.style.backdropFilter = 'blur(10px)';
        header.style.padding = '1.5rem 0';
    } else {
        header.style.background = 'transparent';
        header.style.backdropFilter = 'none';
        header.style.padding = '3rem 0';
    }
});
