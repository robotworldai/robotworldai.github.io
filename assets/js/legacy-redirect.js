'use strict';
const legacyPages = {
  '/index-zh.html': '/zh/',
  '/blog.html': '/blog/',
  '/blog-zh.html': '/blog/zh/',
};
const destination = legacyPages[window.location.pathname];
if (destination) window.location.replace(destination + window.location.search + window.location.hash);
