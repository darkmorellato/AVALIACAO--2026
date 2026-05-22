export function getChartTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  return {
    textColor: isDark ? '#f8fafc' : '#0f172a',
    secondaryColor: isDark ? '#94a3b8' : '#475569',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    datalabelColor: isDark ? '#ffffff' : '#0f172a',
    tooltipBg: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.95)',
    tooltipColor: '#ffffff'
  };
}
