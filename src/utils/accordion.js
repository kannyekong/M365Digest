  const itemsPerPage = 5;
  const faqItems = document.querySelectorAll(".faq-item");

  let currentPage = 1;
  const totalPages = Math.ceil(faqItems.length / itemsPerPage);

  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const pageIndicator = document.getElementById("page-indicator");

  function renderPage() {
    faqItems.forEach((item, index) => {
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;

      item.style.display =
        index >= start && index < end ? "block" : "none";
    });

    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage();
    }
  });

  renderPage();

  