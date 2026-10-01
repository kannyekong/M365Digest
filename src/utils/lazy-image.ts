/**
 * Applies native lazy loading to images that do not already
 * define an explicit loading strategy.
 */
function lazyLoadImages(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    if (!image.hasAttribute("loading")) {
      image.loading = "lazy";
    }

    if (!image.hasAttribute("decoding")) {
      image.decoding = "async";
    }
  });
}

/**
 * Watches the document for images added dynamically by React,
 * Astro islands, or other client-side code.
 */
function observeLazyImages() {
  lazyLoadImages();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;

        if (node.matches("img")) {
          const image = node as HTMLImageElement;

          if (!image.hasAttribute("loading")) {
            image.loading = "lazy";
          }

          if (!image.hasAttribute("decoding")) {
            image.decoding = "async";
          }

          return;
        }

        lazyLoadImages(node);
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

observeLazyImages();
