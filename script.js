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

// Array variables
let filteredMovies;
let renderedMovies;
let filteredMoviesDetails;

// Index variables
let startingIndex;
let finalIndex;

// Container variables
let fullMoviesInfo;
let returnedMoviesCount;
// let existingWatchlist = getMoviesFromLocalStorage();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Reset everything
function resetVariables() {
  filteredMovies = [];
  renderedMovies = [];
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
      loadMoreBtn.classList.remove("is-hidden");
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
    moviesSearchCount.classList.remove("is-hidden");

    renderHtml(renderedMovies);

    if (appState != "search") {
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
  }
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

    const page3Promise = await fetch(
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
                    data-imdbID="${imdbID}"
                    id="movie__add-watchlist-btn"
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

document.querySelector(".movies__tabs").addEventListener("click", (e) => {
  const movieTab = e.target.closest(".movies__tab");
  const tabView = movieTab.dataset.view;
  appState = tabView;

  if (!movieTab) return;

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
});
