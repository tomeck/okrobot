(async function() {
  var container = document.getElementById('postContainer');
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('post');

  if (!slug) {
    container.innerHTML = '<div class="post-error">No post specified. <a href="blog.html" style="color:var(--accent)">Back to blog</a></div>';
    return;
  }

  try {
    var indexRes = await fetch('blog/posts/index.json');
    var posts = await indexRes.json();
    var post = posts.find(function(p) { return p.slug === slug; });

    if (!post) {
      container.innerHTML = '<div class="post-error">Post not found. <a href="blog.html" style="color:var(--accent)">Back to blog</a></div>';
      return;
    }

    document.title = post.title + ' — OK ROBOT';

    var postUrl = 'https://ok-robot.co/blog-post.html?post=' + encodeURIComponent(slug);

    var setMeta = function(attr, key, value) {
      var el = document.querySelector('meta[' + attr + '="' + key + '"]');
      if (el) el.setAttribute('content', value);
    };
    setMeta('name', 'description', post.description);
    setMeta('property', 'og:title', post.title + ' — OK ROBOT');
    setMeta('property', 'og:description', post.description);
    setMeta('property', 'og:url', postUrl);
    setMeta('name', 'twitter:title', post.title + ' — OK ROBOT');
    setMeta('name', 'twitter:description', post.description);

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', postUrl);

    var ldJson = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': post.title,
      'description': post.description,
      'datePublished': post.date,
      'url': postUrl,
      'author': { '@type': 'Person', 'name': post.author || 'OK ROBOT' },
      'publisher': {
        '@type': 'Organization',
        'name': 'OK ROBOT',
        'logo': { '@type': 'ImageObject', 'url': 'https://ok-robot.co/images/ok_robot_logo_400.png' }
      },
      'image': 'https://ok-robot.co/images/ok_robot_logo_400.png',
      'mainEntityOfPage': { '@type': 'WebPage', '@id': postUrl }
    };
    if (post.tags) ldJson.keywords = post.tags.join(', ');
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ldJson);
    document.head.appendChild(script);

    var breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://ok-robot.co/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://ok-robot.co/blog.html' },
        { '@type': 'ListItem', 'position': 3, 'name': post.title, 'item': postUrl }
      ]
    };
    var breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.textContent = JSON.stringify(breadcrumbLd);
    document.head.appendChild(breadcrumbScript);

    var mdRes = await fetch('blog/posts/' + encodeURIComponent(slug) + '.md');
    if (!mdRes.ok) {
      container.innerHTML = '<div class="post-error">Could not load post content. <a href="blog.html" style="color:var(--accent)">Back to blog</a></div>';
      return;
    }

    var markdown = await mdRes.text();
    var html = marked.parse(markdown);

    var dateObj = new Date(post.date + 'T00:00:00');
    var dateStr = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    var tagsHtml = '';
    if (post.tags && post.tags.length) {
      tagsHtml = post.tags.map(function(t) {
        return '<span class="post-meta-tag">' + t + '</span>';
      }).join(' ');
    }

    container.innerHTML =
      '<header class="post-header">' +
        '<div class="post-meta">' +
          '<time class="post-meta-date" datetime="' + post.date + '">' + dateStr + '</time>' +
          (post.author ? '<span>' + post.author + '</span>' : '') +
          tagsHtml +
        '</div>' +
        '<h1 class="post-title">' + post.title + '</h1>' +
        '<p class="post-description">' + post.description + '</p>' +
      '</header>' +
      '<div class="post-body">' + html + '</div>';

  } catch (e) {
    container.innerHTML = '<div class="post-error">Something went wrong loading this post. <a href="blog.html" style="color:var(--accent)">Back to blog</a></div>';
  }
})();
