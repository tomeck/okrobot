(async function() {
  const listEl = document.getElementById('blogList');

  try {
    const res = await fetch('blog/posts/index.json');
    const posts = await res.json();

    posts.sort(function(a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });

    if (posts.length === 0) {
      listEl.innerHTML = '<div class="blog-empty">No posts yet. Check back soon.</div>';
      return;
    }

    listEl.innerHTML = '';

    posts.forEach(function(post) {
      var card = document.createElement('article');
      var link = document.createElement('a');
      link.className = 'blog-card';
      link.href = 'blog-post.html?post=' + encodeURIComponent(post.slug);
      link.setAttribute('aria-label', 'Read: ' + post.title);

      var dateObj = new Date(post.date + 'T00:00:00');
      var dateStr = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      var tagsHtml = '';
      if (post.tags && post.tags.length) {
        tagsHtml = post.tags.map(function(t) {
          return '<span class="blog-card-tag">' + t + '</span>';
        }).join(' ');
      }

      if (post.pinned) link.classList.add('pinned');

      var pinnedBadge = post.pinned ? '<span class="blog-card-pinned">Pinned</span>' : '';

      var brandify = function(s) { return s.replace(/\bOK[- ]ROBOT\b/g, '<span class="ok-robot">$&</span>'); };

      link.innerHTML =
        '<div class="blog-card-meta">' +
          pinnedBadge +
          '<time class="blog-card-date" datetime="' + post.date + '">' + dateStr + '</time>' +
          (post.author ? '<span>' + post.author + '</span>' : '') +
          tagsHtml +
        '</div>' +
        '<h2 class="blog-card-title">' + brandify(post.title) + '</h2>' +
        '<p class="blog-card-desc">' + brandify(post.description) + '</p>' +
        '<div class="blog-card-read">Read more &rarr;</div>';

      card.appendChild(link);
      listEl.appendChild(card);
    });
  } catch (e) {
    listEl.innerHTML = '<div class="blog-empty">Could not load posts.</div>';
  }
})();
