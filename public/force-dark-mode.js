// Force dark mode on load
if (typeof window !== 'undefined') {
    // Add dark class to HTML element
    document.documentElement.classList.add('dark');

    // Set localStorage to persist dark mode
    localStorage.setItem('theme', 'dark');

    console.log('✅ Dark mode forced on');
}
