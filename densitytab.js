  // Add event listener to handle tab switching
  const densityTabs = document.querySelectorAll('.density-tab');

  densityTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Reset styles for all tabs
      densityTabs.forEach(t => {
        t.style.backgroundColor = '#f1f1f1';
        t.style.color = '#555';
      });
  
      // Apply active styles to the selected tab
      tab.style.backgroundColor = '#4CAF50';
      tab.style.color = 'white';
    });
  });
  