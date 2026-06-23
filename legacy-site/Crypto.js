document.addEventListener('DOMContentLoaded', () => {


  const toggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
    const loadMoreBtn = document.getElementById("load-more-crypto");
    const postContainer = document.getElementById("crypto");
  
    let cryptoPosts = [];
    let currentIndex = 0;
  
    // Fetch posts only once
    fetch("posts.json")
      .then(response => response.json())
      .then(data => {
        // Filter out the Politics category
        const cryptoCategory = data.find(category => category.category === "Cryptocurrency");
        if (cryptoCategory) {
          cryptoPosts = cryptoCategory.posts;
        }
      })
      .catch(error => {
        console.error("Failed to Load Posts: ", error);
        postContainer.innerHTML = "<p>Failed to load posts.</p>";
      });
  
    // Load one post per click
    loadMoreBtn.addEventListener('click', () => {
      if (currentIndex < cryptoPosts.length) {
        const post = cryptoPosts[currentIndex++];
        const html = `
          <div class="post-card">
            <div class="badge">Crypto</div>
            <img src="${post.image}" alt="${post.title}">
            <div class="post-content">
              <h3>${post.title}</h3>
              <p class="date">${post.date}</p>
              <p class="excerpt">${post.excerpt}</p>
              <a href="#" class="read-more">Read More</a>
            </div>
          </div>
        `;
        const container = document.querySelector('.crypto-posts .posts-container');
                container.innerHTML += html;
        
      } else {
        loadMoreBtn.style.display = "none"; // hide if no more posts
      }
    });
  });
  