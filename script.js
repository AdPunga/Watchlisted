"use strict";

const searchForm = document.querySelector(".header__search-control");
const headerButtonContainer = document.querySelector(
  ".header__button-container",
);
const searchMovieField = document.querySelector(".header__search-field");

let searchQuery = "";

// Header buttons
function handleRemoveBtn(action) {
  const removeBtn = document.querySelector(
    ".header__button[data-role='remove']",
  );
  removeBtn.classList[action]("is-hidden");
}

// Event listeners

searchForm.addEventListener("click", (e) => {
  const headerBtn = e.target.closest(".header__button");
  if (!headerBtn) return;

  if (headerBtn.dataset.role === "remove") {
    searchMovieField.value = "";
    searchMovieField.focus();
    handleRemoveBtn("add");
  }
});

searchMovieField.addEventListener("input", () => {
  if (searchMovieField.value !== "") {
    handleRemoveBtn("remove");
  } else {
    handleRemoveBtn("add");
  }
});

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleSearchBtn();
});
