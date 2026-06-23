
document.addEventListener('DOMContentLoaded',()=>{
  const toggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');

toggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');

  console.log(navLinks);
});


  const newsFeed=document.getElementById('news-feed');

  fetch("https://newsdata.io/api/1/latest?apikey=pub_85359147204a4676ae83fc7343bb9654c8445&category=politics&country=ke")
  
  .then(response=>response.json()  )
  .then(
    data=>{
      if(data.status==="success"){
        data.results.forEach(article => {
          const articleDiv=document.createElement('div');
          articleDiv.className="news-article";
          articleDiv.innerHTML=`
          <h3> <a href="${article.link}" target="_blank" rel="noopener noreferrer">${article.title}</a</h3>
          <p>${article.description||""}</p>
          <small>${new Date(article.pubDate).toLocaleString()}</small>
         
              <hr>

          `
          newsFeed.appendChild(articleDiv);
        });
      }else{
        newsFeed.innerHTML = "<p>Failed to load news articles.</p>";
      }
    }
  )
  .catch(error=>{
    console.error("Error Fetching News", error)
    newsFeed.innerHTML = "<p>Error loading news articles.</p>";
  });


})
  