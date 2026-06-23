document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

    const loadMoreBtn = document.getElementById("load-more-football");
    const postContainer = document.getElementById("football-posts-container");
  
    let footballPosts = [];
    let currentIndex = 0;
  
    // Fetch posts only once
    fetch("posts.json")
      .then(response => response.json())
      .then(data => {
        // Filter out the Politics category
        const footballCategory = data.find(category => category.category === "Football");
        if (footballCategory) {
          footballPosts = footballCategory.posts;
        }
      })
      .catch(error => {
        console.error("Failed to Load Posts: ", error);
        postContainer.innerHTML = "<p>Failed to load posts.</p>";
      });
  
    // Load one post per click
    loadMoreBtn.addEventListener('click', () => {
      if (currentIndex < footballPosts.length) {
        const post = footballPosts[currentIndex++];
        const html = `
          <div class="post-card">
            <div class="badge">Football</div>
            <img src="${post.image}" alt="${post.title}">
            <div class="post-content">
              <h3>${post.title}</h3>
              <p class="date">${post.date}</p>
              <p class="excerpt">${post.excerpt}</p>
              <a href="#" class="read-more">Read More</a>
            </div>
          </div>
        `;
        postContainer.insertAdjacentHTML("beforeend", html);
      } else {
        loadMoreBtn.style.display = "none"; // hide if no more posts
      }
    });


  const newsContainer=document.getElementById("news-container");
  async function fetchLatestNews() {
    try {
        const response = await fetch("https://newsdata.io/api/1/news?apikey=pub_85359147204a4676ae83fc7343bb9654c8445&q=Football&country=ke,wo&language=en&category=sports  ");
        if (!response.ok) throw new Error("Failed to fetch news");
       
        const data = await response.json();
        console.log(data)
        if (data.status === "success") {
          displayNews(data.results);
        };
        
    } catch (error) {
        newsContainer.innerHTML = `<p class="error">Error fetching news: ${error.message}</p>`;
    }
}

function displayNews(articles) {
    newsContainer.innerHTML = articles.slice(0, 5).map(article => `
       <div class="news-card">
       <h3><a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>
                <p>${article.description ? article.description : "No description available"}</p>
                <small>${new Date(article.pubDate).toLocaleString()}</small>
      </div>
    `).join("");
}

fetchLatestNews();
  });
  