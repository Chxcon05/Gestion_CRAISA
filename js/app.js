// CRAISA - Sistema de Gestión de Leads
// Interactividad para el prototipo web

document.addEventListener('DOMContentLoaded', function() {
    // Crear partículas de fondo
    createParticles();
    
    // Animación de entrada para tarjetas
    animateCards();
    
    // Interactividad de tabla
    setupTableInteractions();
    
    // Interactividad de filtros
    setupFilters();
});

// Crear partículas flotantes
function createParticles() {
    const particlesContainer = document.querySelector('.bg-particles');
    if (!particlesContainer) return;
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Animación de entrada para tarjetas
function animateCards() {
    const cards = document.querySelectorAll('.card, .kpi-card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    cards.forEach(card => {
        observer.observe(card);
    });
}

// Interactividad de tabla
function setupTableInteractions() {
    const tableRows = document.querySelectorAll('.table tbody tr');
    
    tableRows.forEach(row => {
        row.addEventListener('click', function(e) {
            // No navegar si se hace click en un botón o link dentro
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            
            // Agregar efecto visual
            row.style.background = 'rgba(31, 123, 255, 0.1)';
            setTimeout(() => {
                row.style.background = '';
            }, 300);
        });
    });
}

// Interactividad de filtros
function setupFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            // Simulación de filtrado
            console.log('Filtro aplicado:', this.value);
            
            // Efecto visual
            const card = this.closest('.card');
            if (card) {
                card.style.boxShadow = '0 0 30px rgba(31, 123, 255, 0.3)';
                setTimeout(() => {
                    card.style.boxShadow = '';
                }, 500);
            }
        });
    });
}

// Función para mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'rgba(61, 174, 43, 0.9)' : 'rgba(31, 123, 255, 0.9)'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        z-index: 1000;
        font-weight: 600;
        animation: slideIn 0.3s ease, slideOut 0.3s ease 2.7s forwards;
    `;
    notification.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 3000);
}

// Exportar para uso global
window.CRAISA = {
    showNotification
};
