export const DarkMode = {
  init(onToggle) {
    const btn = document.getElementById('darkModeToggle');
    if (!btn) return;
    
    const i = btn.querySelector('i');
    if (!i) return;

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-mode');
      i.className = 'fa-solid fa-sun';
    }

    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      i.className = document.body.classList.contains('dark-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      
      if (typeof onToggle === 'function') {
        onToggle();
      }
    });
  }
};
