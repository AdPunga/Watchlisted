"use strict";

const searchForm = document.querySelector(".header__search-control");
const headerButtonContainer = document.querySelector(
  ".header__button-container",
);
const searchMovieField = document.querySelector(".header__search-field");
const moviesContainer = document.querySelector(
  ".movies__results[data-view='search']",
);
const moviesSearchCount = document.querySelector(".movies__search-count");
const loadMoreBtn = document.querySelector(
  ".movies__button[data-role='load-more']",
);

let searchQuery = "";
let appState = "search";
let renderedMovies = "";

// Array variables
let filteredMovies;
let filteredMoviesDetails;

// Index variables
let startingIndex;
let finalIndex;

// Container variables
let fullMoviesInfo;
let returnedMoviesCount;
let existingWatchlist = getMoviesFromLocalStorage();

///////////////////////////////////////////////////////////////////////////////////////////////////

// Reset everything
function resetVariables() {
  filteredMovies = [];
  renderedMovies = "";
  fullMoviesInfo = [];
  filteredMoviesDetails = [];
  startingIndex = 0;
  returnedMoviesCount = 0;
}

// Header buttons
function handleRemoveBtn(action) {
  const removeBtn = document.querySelector(
    ".header__button[data-role='remove']",
  );
  removeBtn.classList[action]("is-hidden");
}

async function handleSearchBtn() {
  if (searchMovieField.value === "") return;

  resetVariables();

  searchQuery = searchMovieField.value.split(" ").join("+");
  const fetchedMovies = await fetchMoviesData(searchQuery);

  if (fetchedMovies.length === 0) return;

  const sortedMovies = filterAndSortMovies(fetchedMovies);
  fullMoviesInfo = await fetchMovieDetails(sortedMovies);
  filteredMovies = filterMovies(fullMoviesInfo);
  returnedMoviesCount = filteredMovies.length;
  filteredMoviesDetails = filterMovieDetails(filteredMovies);

  if (returnedMoviesCount > 0) {
    document
      .querySelector(".movies__no-data-image")
      .classList.toggle("is-hidden");

    if (returnedMoviesCount <= 10) {
      finalIndex = returnedMoviesCount;
    } else if (returnedMoviesCount > 10) {
      finalIndex = 10;
      // handleElementVisibility(loadMoreBtn, "remove");
    }

    const moviesBatch = getMoviesBatch(
      filteredMoviesDetails,
      startingIndex,
      finalIndex,
    );

    renderedMovies = moviesBatch
      .map((movie) => {
        return renderMovie(movie);
      })
      .join("");

    moviesSearchCount.textContent = `SHOWING ${returnedMoviesCount} MATCHES FOR '${searchMovieField.value.toUpperCase()}'`;

    renderHtml(renderedMovies);

    if (appState != "search") {
      appState = "search";

      document
        .querySelector('.movies__results[data-view="search"]')
        .classList.add("is-active");

      document
        .querySelector('.movies__results[data-view="watchlist"]')
        .classList.remove("is-active");

      document
        .querySelector('.movies__tab[data-view="search"]')
        .classList.add("is-active");

      document
        .querySelector('.movies__tab[data-view="watchlist"]')
        .classList.remove("is-active");
    }

    handleElementVisibility(moviesSearchCount, "remove");

    handleElementVisibility(
      loadMoreBtn,
      appState === "search" &&
        returnedMoviesCount > 10 &&
        finalIndex < returnedMoviesCount
        ? "remove"
        : "add",
    );
  }
}

async function handleLoadMoreBtn() {
  startingIndex = finalIndex;

  if (startingIndex + 10 >= returnedMoviesCount) {
    finalIndex = returnedMoviesCount;
  }

  if (startingIndex + 10 < returnedMoviesCount) {
    finalIndex += 10;
  }

  const moviesBatch = getMoviesBatch(
    filteredMoviesDetails,
    startingIndex,
    finalIndex,
  );

  const additionalMovies = moviesBatch
    .map((movie) => {
      return renderMovie(movie);
    })
    .join("");

  loadMoreMovies(additionalMovies);

  handleElementVisibility(
    loadMoreBtn,
    appState === "search" &&
      returnedMoviesCount > 10 &&
      finalIndex < returnedMoviesCount
      ? "remove"
      : "add",
  );
}

// Step 1 - fetch the data
async function fetchMoviesData(searchQuery) {
  try {
    const page1Promise = fetch(
      `https://www.omdbapi.com/?apikey=53292309&s=${searchQuery}&page=1`,
    );
    const page2Promise = fetch(
      `https://www.omdbapi.com/?apikey=53292309&s=${searchQuery}&page=2`,
    );

    const page3Promise = fetch(
      `https://www.omdbapi.com/?apikey=53292309&s=${searchQuery}&page=3`,
    );

    const [page1, page2, page3] = await Promise.all([
      page1Promise,
      page2Promise,
      page3Promise,
    ]);

    if (!page1.ok) {
      throw new Error(`Request failed for page1: ${page1.status}`);
    }
    if (!page2.ok) {
      throw new Error(`Request failed for page2: ${page2.status}`);
    }
    if (!page3.ok) {
      throw new Error(`Request failed for page3: ${page3.status}`);
    }
    const data1 = await page1.json();
    const data2 = await page2.json();
    const data3 = await page3.json();

    // store all the results into a single array
    const searchResultContainer = [
      ...(data1.Search || []), //short circuiting this; if no results are found on either of the pages, then an empty array will be returned
      ...(data2.Search || []),
      ...(data3.Search || []),
    ];

    return searchResultContainer;
  } catch (error) {
    console.log("ERROR: ", error);
    return [];
  }
}

// Step 2 - remove duplicates and sort by year
function filterAndSortMovies(fetchedData) {
  const fetchedMoviesId = new Set();

  const uniqueValues = fetchedData.filter((movie) => {
    if (fetchedMoviesId.has(movie.imdbID)) {
      return false;
    } else {
      fetchedMoviesId.add(movie.imdbID);
      return true;
    }
  });

  // sort by year
  uniqueValues.sort(
    (a, b) => Number(a.Year.slice(0, 4)) - Number(b.Year.slice(0, 4)),
  );
  return uniqueValues;
}

// Step 3 - fetch additional movie details
async function fetchMovieDetails(sortedMovies) {
  const movieInformation = sortedMovies.map(async (movie) => {
    const result = await fetch(
      `https://www.omdbapi.com/?apikey=53292309&i=${movie.imdbID}`,
    );
    const data = await result.json();
    return data;
  });

  return await Promise.all(movieInformation);
}

// Step 4 - filter out documentaries, shorts and movies without a specified duration
function filterMovies(movieDetails) {
  return movieDetails.filter(
    (movie) =>
      !movie.Genre.includes("Documentary") &&
      !movie.Genre.includes("Short") &&
      movie.Runtime != "N/A",
  );
}

// Step 5 - filter out the unnecessary movie information
function filterMovieDetails(filteredMovies) {
  return filteredMovies.map((movie) => {
    const { Poster, Title, imdbRating, Year, Runtime, Genre, Plot, imdbID } =
      movie;
    const renderedPoster = Poster === "N/A" ? "/images/noPoster.png" : Poster;

    return {
      Title: Title,
      imdbRating: imdbRating,
      Year: Year,
      Runtime: Runtime,
      Genre: Genre,
      Plot: Plot,
      Poster: renderedPoster,
      imdbID: imdbID,
    };
  });
}

// Step 6 - get movies in batches by 10
function getMoviesBatch(filteredData, startingIndex, finalIndex) {
  return filteredData.slice(startingIndex, finalIndex);
}

// Step 7 - create the movie object
function renderMovie(movie) {
  const { Poster, Title, imdbRating, Year, Runtime, Genre, Plot, imdbID } =
    movie;

  return `<article class="movie">
              <div class="movie__media">
                <img src="${Poster}" alt="" class="movie__poster" />
              </div>

              <div class="movie__content">
                <div class="movie__details">
                  <h3 class="movie__title">${Title}</h3>

                  <div class="movie__information">
                    <p class="movie__year">${Year}</p>
                    <i class="fa-solid fa-circle"></i>
                    <p class="movie__duration">${Runtime}</p>
                    <i class="fa-solid fa-circle"></i>
                    <p class="movie__genre">${Genre}</p>
                  </div>

                  <p class="movie__plot">${Plot}</p>
                </div>

                <div class="movie__controls">
                  <div class="movie__rating-box">
                    <i class="fa-solid fa-star"></i>
                    <p class="movie__rating">${imdbRating}</p>
                  </div>

                  <button
                    class="movie__add-watchlist-btn"
                    aria-label="Add to watchlist"
                    data-imdbID="${imdbID}"
                  >
                    <i class="fa-solid fa-circle-plus"></i>
                    <span class="movie__btn-label">Watchlist</span>
                  </button>
                </div>
              </div>
            </article>`;
}

// Step 8 - render the HTML
function renderHtml(renderedMoviesObject) {
  moviesContainer.innerHTML = renderedMoviesObject;
  replaceErroredPosters();
}

// Step 9 - Replace missing posters
function replaceErroredPosters() {
  document.querySelectorAll(".movie__poster").forEach((img) => {
    img.addEventListener("error", (e) => {
      e.target.src = "/images/noPoster.png";
    });
  });
}

function handleElementVisibility(element, action) {
  element.classList[action]("is-hidden");
}

function loadMoreMovies(renderedHtml) {
  moviesContainer.insertAdjacentHTML("beforeend", renderedHtml);
  replaceErroredPosters();
}

// Local Storage

function getMoviesFromLocalStorage() {
  const existingWatchlistMovies = localStorage.getItem("watchlistMovies");

  const moviesArray = existingWatchlistMovies
    ? JSON.parse(existingWatchlistMovies)
    : [];

  return moviesArray;
}

function addToWatchlistArray(movie, watchlistArray) {
  watchlistArray.push(movie);

  return watchlistArray;
}

function updateLocalStorage(watchlistArray) {
  const stringifiedArray = JSON.stringify(watchlistArray);

  return localStorage.setItem("watchlistMovies", stringifiedArray);
}

// Add to watchlist button
if (appState === "search") {
  moviesContainer.addEventListener("click", (e) => {
    const watchlistBtn = e.target.closest(".movie__add-watchlist-btn");
    if (!watchlistBtn) return;

    // const currentMovieID = watchlistBtn.dataset.imdbid;

    // const currentMovie = filteredMoviesDetails.filter((movie) => {
    //   return movie.imdbID === currentMovieID;
    // })[0];

    // const updatedWatchlistArray = addToWatchlistArray(
    //   currentMovie,
    //   existingWatchlist,
    // );

    watchlistBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Added!`;

    // updateLocalStorage(updatedWatchlistArray);
    console.log(watchlistBtn);

    // if (e.target.dataset.imdbid) {

    //   const thisMovie = fetchedMoviesFilteredInfo.filter((movie) => {
    //     return movie.imdbID === e.target.dataset.imdbid;
    //   })[0];

    //   const updatedWatchlistArray = addMovieToLocalStorage(
    //     thisMovie,
    //     existingWatchlist,
    //   );
    //   e.target.innerHTML = `<i class="fa-solid fa-circle-check"></i> Added!`;
    //   setTimeout(() => {
    //     e.target.classList.add("fade-out");
    //   }, 1500);
    //   updateLocalStorage(updatedWatchlistArray);
    // }
  });
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

loadMoreBtn.addEventListener("click", () => {
  handleLoadMoreBtn();
});

document.querySelector(".movies__tabs").addEventListener("click", (e) => {
  const movieTab = e.target.closest(".movies__tab");
  if (!movieTab) return;

  const tabView = movieTab.dataset.view;
  appState = tabView;

  document.querySelectorAll(".movies__tab").forEach((movieTab) => {
    movieTab.classList.remove("is-active");
  });

  movieTab.classList.add("is-active");

  document.querySelectorAll(".movies__results").forEach((appScreen) => {
    appScreen.classList.remove("is-active");
  });

  document
    .querySelector(`.movies__results[data-view="${tabView}"]`)
    .classList.add("is-active");

  returnedMoviesCount > 0 && appState === "search"
    ? handleElementVisibility(moviesSearchCount, "remove")
    : handleElementVisibility(moviesSearchCount, "add");

  if (appState === "watchlist" || finalIndex === returnedMoviesCount) {
    handleElementVisibility(loadMoreBtn, "add");
  } else {
    handleElementVisibility(loadMoreBtn, "remove");
  }
});
