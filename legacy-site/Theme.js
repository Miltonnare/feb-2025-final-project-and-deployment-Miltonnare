document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // Check if dark mode is already saved in localStorage
    if (localStorage.getItem('darkMode') === 'enabled') {
      document.body.classList.add('dark-mode');
      themeIcon.classList.replace('fa-moon', 'fa-sun'); // Change icon to sun
    }
  
    // Toggle dark mode on button click
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      
      if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled'); // Save dark mode preference
        themeIcon.classList.replace('fa-moon', 'fa-sun'); // Change icon to sun
      } else {
        localStorage.setItem('darkMode', 'disabled'); // Save light mode preference
        themeIcon.classList.replace('fa-sun', 'fa-moon'); // Change icon to moon
      }
    });
  });
  