// Global variables
var pageNumber = 'Select Works'; // Default view
var currentWorks = []; // Store current works data
var selectedWorks = []; // Store selected works for batch operations
var currentFilters = {
  search: '',
  medium: '',
  tag: 'all',
  project: ''
};
var currentSort = 'order-desc'; // Default sort order

$(document).ready(function() {
  // Initialize the page
  loadAndDisplayProjectTitles();
  countWorksStatistics();

  // Initialize event listeners
  initializeEventListeners();

  // Initialize file upload validation
  document.getElementById('photoPostUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const maxSize = 1.2 * 1024 * 1024; // Maximum file size (1.2 MB)

    if (file) {
      if (file.size > maxSize) {
        showToast('Your picture is too large (the max is 1.2 MB), reduce the quality and try again.', 'error');
        event.target.value = '';
        document.getElementById('uploadPreview').src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMThweCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTk5OTkiPlNlbGVjdCBJbWFnZTwvdGV4dD48L3N2Zz4=';
      } else {
        // Preview the image
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('uploadPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }
  });
});

// Initialize all event listeners
function initializeEventListeners() {
  // Navigation and view options
  $('#viewSelectWorks').click(function() {
    setActiveNavItem(this);
    pageNumber = 'Select Works';
    getAllWorks(pageNumber);
  });

  $('#viewUnselectedWorks').click(function() {
    setActiveNavItem(this);
    pageNumber = 0;
    getAllWorks(pageNumber);
  });

  $('#viewDeletedWorks').click(function() {
    setActiveNavItem(this);
    pageNumber = 'invisible';
    getAllWorks(pageNumber);
  });

  $('#viewCarouselWorks').click(function() {
    setActiveNavItem(this);
    pageNumber = 'carousel';
    getAllWorks(pageNumber);
  });

  // Add new work button
  $('#addNewWorkBtn').click(function() {
    openPostForm();
  });

  // Upload work button
  $('#uploadWorkButton').click(function() {
    postPhoto();
  });

  // Update work button
  $('#updateWorkBtn').click(function() {
    updateWork();
  });

  // Delete work button
  $('#deleteWorkBtn').click(function() {
    showConfirmationModal(
        'Delete Work',
        'Are you sure you want to delete this work? This will remove it from Select Works and Carousel.',
        function() {
          deleteWork();
        }
    );
  });

  // Search input
  $('#searchInput').on('input', function() {
    currentFilters.search = $(this).val().toLowerCase();
    applyFilters();
  });

  // Medium filter
  $('#mediumFilter').change(function() {
    currentFilters.medium = $(this).val();
    applyFilters();
  });

  // Quick filter tags
  $('.filter-tag').click(function() {
    $('.filter-tag').removeClass('active');
    $(this).addClass('active');
    currentFilters.tag = $(this).data('filter');
    applyFilters();
  });

  // Sort options
  $('.dropdown-item.sort-option').click(function(e) {
    e.preventDefault();
    currentSort = $(this).data('sort');
    sortWorks();
  });

  // Multi-select toggle
  $('#enableMultiSelect').change(function() {
    if ($(this).is(':checked')) {
      enableMultiSelect();
    } else {
      disableMultiSelect();
    }
  });

  // Multi-select actions
  $('#selectAllBtn').click(function() {
    $('.work-card').addClass('selected');
    updateSelectedCount();
  });

  $('#clearSelectionBtn').click(function() {
    $('.work-card').removeClass('selected');
    updateSelectedCount();
  });

  $('#batchSelectWorksBtn').click(function() {
    if (selectedWorks.length === 0) {
      showToast('No works selected', 'warning');
      return;
    }

    showConfirmationModal(
        'Add to Select Works',
        `Are you sure you want to add ${selectedWorks.length} work(s) to Select Works?`,
        function() {
          batchUpdateWorks('selectWork', 1);
        }
    );
  });

  $('#batchCarouselBtn').click(function() {
    if (selectedWorks.length === 0) {
      showToast('No works selected', 'warning');
      return;
    }

    showConfirmationModal(
        'Add to Carousel',
        `Are you sure you want to add ${selectedWorks.length} work(s) to the Carousel?`,
        function() {
          batchUpdateWorks('carousel', 1);
        }
    );
  });

  $('#batchDeleteBtn').click(function() {
    if (selectedWorks.length === 0) {
      showToast('No works selected', 'warning');
      return;
    }

    showConfirmationModal(
        'Delete Works',
        `Are you sure you want to delete ${selectedWorks.length} work(s)?`,
        function() {
          batchDeleteWorks();
        }
    );
  });
}

// Set active navigation item
function setActiveNavItem(element) {
  $('.nav-link').removeClass('active');
  $(element).addClass('active');
}

// Enable multi-select mode
function enableMultiSelect() {
  $('#multiSelectToolbar').show();
  updateSelectedCount();

  // Add click handler for cards in multi-select mode
  $('.work-card').off('click').on('click', function(e) {
    e.preventDefault();
    $(this).toggleClass('selected');
    updateSelectedCount();
  });
}

// Disable multi-select mode
function disableMultiSelect() {
  $('.work-card').removeClass('selected');
  $('#multiSelectToolbar').hide();
  selectedWorks = [];

  // Restore normal click handler
  $('.work-card').off('click').on('click', function() {
    const workId = $(this).data('id');
    const work = currentWorks.find(w => w.id === workId);
    if (work) {
      openPhotoInfo(
          work.id,
          "../thumbnails/"+work.location,
          work.name,
          work.firstDescription,
          work.secondDescription,
          work.medium,
          work.isColor,
          work.availability,
          work.creationYear,
          work.orderOfDisplay,
          work.carousel,
          work.visible,
          work.isSelectWork,
          work.long_description
      );
    }
  });
}

// Update selected count
function updateSelectedCount() {
  selectedWorks = [];
  $('.work-card.selected').each(function() {
    selectedWorks.push($(this).data('id'));
  });

  $('#selectedItemsCount').text(selectedWorks.length + ' selected');
}

// Get all works from API
function getAllWorks(theYear) {
  $('#loadingSpinner').show();
  pageNumber = theYear;
  let yearData = {
    theYear: theYear
  };

  $.ajax({
    url: "../actions/picturesAPI.php",
    type: "GET",
    data: yearData,
    dataType: "json",
    success: function(data) {
      console.log("Loaded works:", data.length);
      currentWorks = data;
      insertData(data);
      updateResultsInfo(data.length);
      $('#loadingSpinner').hide();

      // Update statistics after loading works
      countWorksStatistics();
    },
    error: function(xhr, status, error) {
      console.log("Error loading works:", error);
      console.log("Status:", status);
      console.log("Response:", xhr.responseText);

      showToast("Failed to load works. Please try again.", "error");
      $('#loadingSpinner').hide();
    },
  });
}

// Load project titles for dropdown
function loadAndDisplayProjectTitles() {
  $.ajax({
    url: '../actions/projectsAPI.php',
    type: 'GET',
    dataType: 'json',
    success: function(projects) {
      let dropdown = $('#projectsDropdown');
      dropdown.empty();

      // Add a default option
      dropdown.append($('<option>').text('Select a Project').attr('disabled', true).attr('selected', true).attr('value', ''));

      projects.forEach(function(project) {
        let title = project.title;
        let option = $('<option>').text(title).val(title);
        dropdown.append(option);
      });

      // Event listener for project selection
      dropdown.change(function() {
        let selectedTitle = $(this).val();
        if (selectedTitle) {
          currentFilters.project = selectedTitle;
          getProjectWorks(selectedTitle);
        }
      });
    },
    error: function(xhr, status, error) {
      console.log('Error loading project titles:', error);
      console.log("Response:", xhr.responseText);
      showToast("Failed to load projects. Please try again.", "error");
    }
  });
}

// Get works for a specific project
function getProjectWorks(project) {
  $('#loadingSpinner').show();
  pageNumber = 'active';
  whichProject = {
    project: project
  };

  $.ajax({
    url: "../actions/getWorksForPictureAdminBS.php",
    type: "GET",
    data: whichProject,
    dataType: "json",
    success: function(data) {
      console.log("Project works loaded:", data);
      makeProjectCards(data);
      $('#loadingSpinner').hide();
    },
    error: function(xhr, status, error) {
      console.log("Error loading project works:", error);
      console.log("Response:", xhr.responseText);
      showToast("Failed to load project works. Please try again.", "error");
      $('#loadingSpinner').hide();
    },
  });
}

// Create cards for project works
function makeProjectCards(projects) {
  $('#worksContainer').empty();

  let projectPromises = projects.map(project => {
    return fetchWorkIdsForProject(project.id).then(workIds => {
      return getWorksInfoFromIdsArray(workIds).then(allWorksForProject => {
        return { project, allWorksForProject };
      });
    });
  });

  Promise.all(projectPromises).then(results => {
    let allWorks = [];
    results.forEach(({ project, allWorksForProject }) => {
      allWorks = allWorks.concat(allWorksForProject);
    });

    currentWorks = allWorks;
    insertData(allWorks);
    updateResultsInfo(allWorks.length);
  }).catch(error => {
    console.error('Error processing project data:', error);
    showToast("An error occurred while processing project data.", "error");
  });
}

// Fetch work IDs for a project
function fetchWorkIdsForProject(id) {
  return $.ajax({
    url: '../actions/worksOfProjectsAPI.php',
    type: 'GET',
    data: { 'projectId': id },
    dataType: 'json'
  });
}

// Get works info from array of IDs
function getWorksInfoFromIdsArray(projectIds) {
  return $.ajax({
    url: '../actions/getWorksByIdArray.php',
    method: 'GET',
    data: {'projectIds' : projectIds},
    dataType: 'json',
  });
}

// Insert works data into the UI
function insertData(data) {
  let items = data;
  currentWorks = items;

  // Clear container
  $('#worksContainer').empty();

  if (items.length === 0) {
    $('#emptyState').show();
    return;
  }

  $('#emptyState').hide();

  // Sort the items
  items = sortItemsByCurrentCriteria(items);

  // Create cards for each item
  items.forEach(function(item) {
    let id = item.id;
    let location = "../thumbnails/"+item.location;
    let name = item.name;
    let medium = item.medium;
    let isColor = item.isColor;
    let availability = item.availability;
    let creationYear = item.creationYear;
    let carousel = item.carousel;
    let isSelectWork = item.isSelectWork;

    // Create card elements
    let cardCol = $('<div>').addClass('col-xl-3 col-lg-4 col-md-6 col-sm-6 mb-4');
    let card = $('<div>').addClass('work-card').attr('data-id', id);

    // Image container
    let imageContainer = $('<div>').addClass('work-image');
    let image = $('<img>').attr('src', location).attr('alt', name);
    imageContainer.append(image);

    // Badge container
    let badgeContainer = $('<div>').addClass('work-badges');

    // Add appropriate badges based on work properties
    if (isSelectWork == 1) {
      badgeContainer.append($('<span>').addClass('badge badge-select-works text-white').text('Select Works'));
    }

    if (carousel == 1) {
      badgeContainer.append($('<span>').addClass('badge badge-carousel text-white').text('Carousel'));
    }

    if (availability == 1) {
      badgeContainer.append($('<span>').addClass('badge badge-available text-white').text('Available'));
    }

    if (isColor == 1) {
      badgeContainer.append($('<span>').addClass('badge badge-color text-white').text('Color'));
    } else {
      badgeContainer.append($('<span>').addClass('badge badge-bw text-white').text('B&W'));
    }

    // Work info
    let infoContainer = $('<div>').addClass('work-info');
    let title = $('<h5>').addClass('work-title').text(name);
    let mediumInfo = $('<div>').addClass('work-medium').text(medium);
    let yearInfo = $('<div>').addClass('work-year').text(creationYear || 'No year');

    infoContainer.append(title, mediumInfo, yearInfo);

    // Selection overlay for multi-select
    let selectionOverlay = $('<div>').addClass('selected-card-overlay');
    let selectionIcon = $('<div>').addClass('selection-icon').html('<i class="fas fa-check"></i>');
    selectionOverlay.append(selectionIcon);

    // Assemble card
    card.append(imageContainer, badgeContainer, infoContainer, selectionOverlay);
    cardCol.append(card);

    // Add click handler
    card.on('click', function() {
      if ($('#enableMultiSelect').is(':checked')) {
        // In multi-select mode, toggle selection
        $(this).toggleClass('selected');
        updateSelectedCount();
      } else {
        // Normal mode, open edit modal
        openPhotoInfo(
            id,
            location,
            name,
            item.firstDescription,
            item.secondDescription,
            medium,
            isColor,
            availability,
            creationYear,
            item.orderOfDisplay,
            carousel,
            item.visible,
            isSelectWork,
            item.long_description
        );
      }
    });

    // Append to container
    $('#worksContainer').append(cardCol);
  });

  // Reapply multi-select if enabled
  if ($('#enableMultiSelect').is(':checked')) {
    enableMultiSelect();
  }
}

// Sort items by current criteria
function sortItemsByCurrentCriteria(items) {
  switch (currentSort) {
    case 'name-asc':
      return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'name-desc':
      return items.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    case 'newest':
      return items.sort((a, b) => (b.creationYear || 0) - (a.creationYear || 0));
    case 'oldest':
      return items.sort((a, b) => (a.creationYear || 0) - (b.creationYear || 0));
    case 'order-desc':
      return items.sort((a, b) => (b.orderOfDisplay || 0) - (a.orderOfDisplay || 0));
    case 'order-asc':
      return items.sort((a, b) => (a.orderOfDisplay || 0) - (b.orderOfDisplay || 0));
    default:
      return items;
  }
}

// Apply all filters to the current works
function applyFilters() {
  if (!currentWorks || currentWorks.length === 0) return;

  console.log("Applying filters:", currentFilters);

  let filteredWorks = [...currentWorks];

  // Apply search filter
  if (currentFilters.search && currentFilters.search.trim() !== '') {
    const searchTerms = currentFilters.search.toLowerCase().trim();
    console.log("Searching for:", searchTerms);

    filteredWorks = filteredWorks.filter(work => {
      return (
          (work.name && work.name.toLowerCase().includes(searchTerms)) ||
          (work.medium && work.medium.toLowerCase().includes(searchTerms)) ||
          (work.firstDescription && work.firstDescription.toLowerCase().includes(searchTerms)) ||
          (work.secondDescription && work.secondDescription.toLowerCase().includes(searchTerms)) ||
          (work.long_description && work.long_description.toLowerCase().includes(searchTerms)) ||
          (work.creationYear && work.creationYear.toString().includes(searchTerms))
      );
    });

    console.log("After search filter:", filteredWorks.length);
  }

  // Apply medium filter
  if (currentFilters.medium && currentFilters.medium !== '') {
    console.log("Filtering by medium:", currentFilters.medium);
    filteredWorks = filteredWorks.filter(work => work.medium === currentFilters.medium);
    console.log("After medium filter:", filteredWorks.length);
  }

  // Apply tag filter
  if (currentFilters.tag && currentFilters.tag !== 'all') {
    console.log("Filtering by tag:", currentFilters.tag);
    switch (currentFilters.tag) {
      case 'select-works':
        filteredWorks = filteredWorks.filter(work => work.isSelectWork == 1);
        break;
      case 'carousel':
        filteredWorks = filteredWorks.filter(work => work.carousel == 1);
        break;
      case 'color':
        filteredWorks = filteredWorks.filter(work => work.isColor == 1);
        break;
      case 'bw':
        filteredWorks = filteredWorks.filter(work => work.isColor == 0);
        break;
      case 'available':
        filteredWorks = filteredWorks.filter(work => work.availability == 1);
        break;
    }
    console.log("After tag filter:", filteredWorks.length);
  }

  // Make sure we have works to display
  if (filteredWorks.length === 0) {
    $('#emptyState').show();
    $('#worksContainer').empty();
  } else {
    $('#emptyState').hide();
    insertData(filteredWorks);
  }

  updateResultsInfo(filteredWorks.length);
}

// Sort works by the current sort criteria
function sortWorks() {
  applyFilters();
}

// Update results info text
function updateResultsInfo(count) {
  let text = `Showing ${count} work${count !== 1 ? 's' : ''}`;

  if (currentFilters.search) {
    text += ` matching "${currentFilters.search}"`;
  }

  if (currentFilters.medium) {
    text += ` in "${currentFilters.medium}"`;
  }

  if (currentFilters.tag && currentFilters.tag !== 'all') {
    text += ` tagged as "${currentFilters.tag.replace('-', ' ')}"`;
  }

  if (currentFilters.project) {
    text += ` in project "${currentFilters.project}"`;
  }

  $('#resultsInfo').text(text);
}

// Count works statistics from current works
function countWorksStatistics() {
  // Get all works to count
  $.ajax({
    url: "../actions/picturesAPI.php",
    type: "GET",
    data: { theYear: 'everything' },
    dataType: "json",
    success: function(data) {
      console.log("Statistics data loaded:", data.length, "works");

      if (Array.isArray(data)) {
        const totalVisible = data.filter(work => work.visible == 1).length;
        const selectWorks = data.filter(work => work.isSelectWork == 1 && work.visible == 1).length;
        const carousel = data.filter(work => work.carousel == 1 && work.visible == 1).length;

        $('#totalWorksCount').text(totalVisible);
        $('#selectWorksCount').text(selectWorks);
        $('#carouselWorksCount').text(carousel);

        console.log("Statistics updated -", "Total:", totalVisible, "Select Works:", selectWorks, "Carousel:", carousel);
      }
    },
    error: function(xhr, status, error) {
      console.log("Failed to load statistics data:", error);
      console.log("Response:", xhr.responseText);

      // If failed, just show placeholders
      $('#totalWorksCount').text('?');
      $('#selectWorksCount').text('?');
      $('#carouselWorksCount').text('?');
    }
  });
}

// Open the photo info modal
function openPhotoInfo(id, location, name, firstDescription, secondDescription, medium, isColor, availability, creationYear, orderOfDisplay, carousel, visible, isSelectWork, longDescription) {
  console.log("Opening photo info for work ID:", id);

  // Set delete/restore button based on visibility
  document.getElementById('deleteOrRestore').innerHTML = visible == 0
      ? '<button type="button" class="btn btn-info" id="restoreWorkBtn"><i class="fas fa-trash-restore me-1"></i> Restore</button>'
      : '<button type="button" class="btn btn-danger" id="deleteWorkBtn"><i class="fas fa-trash me-1"></i> Delete</button>';

  // Set event listener for restore button if visible
  if (visible == 0) {
    $('#restoreWorkBtn').click(function() {
      restoreWork();
    });
  }

  // Set values of form fields
  $('#photoId').val(id);
  $('#photoName').val(name);
  $('#photoFirstDescription').val(firstDescription);
  $('#photoSecondDescription').val(secondDescription);
  $('#photoLongDescription').val(longDescription);
  $('#previewImage').attr('src', location);
  $('#workIdBadge').text('ID: ' + id);

  // Set badges
  $('#colorBadge').toggle(isColor == 1);
  $('#bwBadge').toggle(isColor == 0);
  $('#selectWorksBadge').toggle(isSelectWork == 1);
  $('#carouselBadge').toggle(carousel == 1);
  $('#availableBadge').toggle(availability == 1);

  // Set medium dropdown
  var selectElement = document.getElementById("photoMedium");
  for (var i = 0; i < selectElement.options.length; i++) {
    if (selectElement.options[i].value === medium) {
      selectElement.options[i].selected = true;
      break;
    }
  }

  // Set other fields
  $('#photoCreationYear').val(creationYear);
  $('#updateOrderOfDisplay').val(orderOfDisplay);

  // Set radio buttons
  if (isColor == 1) {
    document.getElementById('colorYesEdit').checked = true;
  } else {
    document.getElementById('colorNoEdit').checked = true;
  }

  if (availability == 1) {
    document.getElementById('availableYesEdit').checked = true;
  } else {
    document.getElementById('availableNoEdit').checked = true;
  }

  if (carousel == 1) {
    document.getElementById('carouselYesEdit').checked = true;
  } else {
    document.getElementById('carouselNoEdit').checked = true;
  }

  if (isSelectWork == 1) {
    document.getElementById('selectWorksYesEdit').checked = true;
  } else {
    document.getElementById('selectWorksNoEdit').checked = true;
  }

  // Open the Bootstrap modal
  var modal = new bootstrap.Modal(document.getElementById('photoUpdateModal'));
  modal.show();
}

// Open the post form modal
function openPostForm() {
  // Reset form
  document.getElementById('addWorkForm').reset();
  document.getElementById('uploadPreview').src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMThweCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTk5OTkiPlNlbGVjdCBJbWFnZTwvdGV4dD48L3N2Zz4=';

  // Set default values
  document.getElementById('colorYesPost').checked = true;
  document.getElementById('availableYesPost').checked = true;
  document.getElementById('selectWorksNoPost').checked = true;
  document.getElementById('carouselNoPost').checked = true;

  // Open modal
  var modal = new bootstrap.Modal(document.getElementById('photoPostModal'));
  modal.show();
}

// Post a new photo
function postPhoto() {
  console.log("Starting upload process...");

  let isColor = $('input[name=isColorPost]:checked').val();
  let isAvailable = $('input[name=isAvailablePost]:checked').val();
  let isCarousel = $('input[name=isCarouselPost]:checked').val();
  let isSelectWork = $('input[name=isSelectWorksPost]:checked').val();

  let colorInt = isColor === 'true' ? 1 : 0;
  let availableInt = isAvailable === 'true' ? 1 : 0;
  let carouselInt = isCarousel === 'true' ? 1 : 0;
  let selectWorkInt = isSelectWork === 'true' ? 1 : 0;

  var fileInput = $('#photoPostUpload')[0].files[0];
  if (!fileInput) {
    showToast('Please select an image file', 'warning');
    return;
  }

  if (!$('#photoPostName').val()) {
    showToast('Please enter a name for the work', 'warning');
    return;
  }

  // Show loading spinner
  $('#loadingSpinner').show();

  // Disable upload button to prevent multiple submissions
  document.getElementById('uploadWorkButton').disabled = true;

  var postData = new FormData();
  postData.append('name', $('#photoPostName').val());
  postData.append('firstDescription', $('#photoPostFirstDescription').val());
  postData.append('secondDescription', $('#photoPostSecondDescription').val());
  postData.append('long_description', $('#photoPostLongDescription').val());
  postData.append('medium', $('#photoPostMedium').val());
  postData.append('isColor', colorInt);
  postData.append('availability', availableInt);
  postData.append('creationYear', $('#photoPostCreationYear').val());
  postData.append('photo', fileInput);
  postData.append('orderOfDisplay', $('#postOrderOfDisplay').val() || 0);
  postData.append('carousel', carouselInt);
  postData.append('selectWork', selectWorkInt);

  console.log("Uploading file:", fileInput.name, "Size:", fileInput.size);

  $.ajax({
    url: '../actions/picturesAPI.php',
    type: 'POST',
    data: postData,
    processData: false,
    contentType: false,
    success: function(response) {
      console.log("Upload successful. Response:", response);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Re-enable upload button
      document.getElementById('uploadWorkButton').disabled = false;

      // Close modal
      try {
        var modal = bootstrap.Modal.getInstance(document.getElementById('photoPostModal'));
        if (modal) {
          modal.hide();
        } else {
          $('#photoPostModal').modal('hide');
        }
      } catch(e) {
        console.error("Error closing modal:", e);
        $('#photoPostModal').modal('hide');
      }

      // Refresh the current view
      getAllWorks(pageNumber);

      // Show success message
      showToast('Your work has been successfully posted!', 'success');

      // Update statistics
      countWorksStatistics();
    },
    error: function(xhr, status, error) {
      console.error("Upload failed. Status:", status);
      console.error("Error:", error);
      console.error("Response:", xhr.responseText);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Re-enable upload button
      document.getElementById('uploadWorkButton').disabled = false;

      // Show error message
      showToast('There has been a problem uploading your work', 'error');
    }
  });
}

// Update an existing work
function updateWork() {
  console.log("Starting work update...");

  // Get form data
  let isColor = $('input[name=isColorEdit]:checked').val();
  let isAvailable = $('input[name=isAvailableEdit]:checked').val();
  let isCarousel = $('input[name=isCarouselEdit]:checked').val();
  let isSelectWork = $('input[name=isSelectWorksEdit]:checked').val();

  let colorInt = isColor === 'true' ? 1 : 0;
  let availableInt = isAvailable === 'true' ? 1 : 0;
  let carouselInt = isCarousel === 'true' ? 1 : 0;
  let selectWorkInt = isSelectWork === 'true' ? 1 : 0;

  // Show loading spinner
  $('#loadingSpinner').show();

  // Disable save button
  document.getElementById('updateWorkBtn').disabled = true;

  var formData = {
    id: $('#photoId').val(),
    name: $('#photoName').val(),
    firstDescription: $('#photoFirstDescription').val(),
    secondDescription: $('#photoSecondDescription').val(),
    long_description: $('#photoLongDescription').val(),
    medium: $('#photoMedium').val(),
    isColor: colorInt,
    availability: availableInt,
    creationYear: $('#photoCreationYear').val(),
    orderOfDisplay: $('#updateOrderOfDisplay').val() || 0,
    carousel: carouselInt,
    selectWork: selectWorkInt
  };

  console.log("Updating work with data:", formData);

  // Convert formData to query string for PATCH request
  const queryString = Object.keys(formData)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(formData[key]))
      .join('&');

  console.log("Query string:", queryString);

  // Send the form data via AJAX
  $.ajax({
    url: '../actions/picturesAPI.php',
    type: 'PATCH',
    data: queryString,
    contentType: 'application/x-www-form-urlencoded',
    success: function(response) {
      console.log("Update successful. Response:", response);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Re-enable save button
      document.getElementById('updateWorkBtn').disabled = false;

      // Close modal
      try {
        var modal = bootstrap.Modal.getInstance(document.getElementById('photoUpdateModal'));
        if (modal) {
          modal.hide();
        } else {
          $('#photoUpdateModal').modal('hide');
        }
      } catch(e) {
        console.error("Error closing modal:", e);
        $('#photoUpdateModal').modal('hide');
      }

      // Refresh the current view
      getAllWorks(pageNumber);

      // Show success message
      showToast('Your work has been successfully updated!', 'success');

      // Update statistics
      countWorksStatistics();
    },
    error: function(xhr, status, error) {
      console.error("Update failed. Status:", status);
      console.error("Error:", error);
      console.error("Response:", xhr.responseText);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Re-enable save button
      document.getElementById('updateWorkBtn').disabled = false;

      // Show error message
      showToast('There has been a problem updating your work', 'error');
    }
  });
}

// Delete a work
function deleteWork() {
  console.log("Starting delete operation...");

  // Show loading spinner
  $('#loadingSpinner').show();

  var workId = $('#photoId').val();
  console.log("Deleting work ID:", workId);

  $.ajax({
    url: '../actions/picturesAPI.php',
    type: 'DELETE',
    data: "id=" + workId,
    contentType: 'application/x-www-form-urlencoded',
    success: function(response) {
      console.log("Delete successful. Response:", response);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Close modal
      try {
        var modal = bootstrap.Modal.getInstance(document.getElementById('photoUpdateModal'));
        if (modal) {
          modal.hide();
        } else {
          $('#photoUpdateModal').modal('hide');
        }
      } catch(e) {
        console.error("Error closing modal:", e);
        $('#photoUpdateModal').modal('hide');
      }

      // Refresh the current view
      getAllWorks(pageNumber);

      // Show success message
      showToast('Your work has been successfully deleted!', 'success');

      // Update statistics
      countWorksStatistics();
    },
    error: function(xhr, status, error) {
      console.error("Delete failed. Status:", status);
      console.error("Error:", error);
      console.error("Response:", xhr.responseText);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Show error message
      showToast('There has been a problem deleting your work', 'error');
    }
  });
}

// Restore a deleted work
function restoreWork() {
  console.log("Starting restore operation...");

  // Show loading spinner
  $('#loadingSpinner').show();

  var workId = $('#photoId').val();
  console.log("Restoring work ID:", workId);

  $.ajax({
    url: '../actions/picturesAPI.php',
    type: 'PATCH',
    data: "id=" + workId + "&restore=restore",
    contentType: 'application/x-www-form-urlencoded',
    success: function(response) {
      console.log("Restore successful. Response:", response);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Close modal
      try {
        var modal = bootstrap.Modal.getInstance(document.getElementById('photoUpdateModal'));
        if (modal) {
          modal.hide();
        } else {
          $('#photoUpdateModal').modal('hide');
        }
      } catch(e) {
        console.error("Error closing modal:", e);
        $('#photoUpdateModal').modal('hide');
      }

      // Refresh the current view
      getAllWorks('invisible');

      // Show success message
      showToast('Your work has been successfully restored!', 'success');

      // Update statistics
      countWorksStatistics();
    },
    error: function(xhr, status, error) {
      console.error("Restore failed. Status:", status);
      console.error("Error:", error);
      console.error("Response:", xhr.responseText);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Show error message
      showToast('There has been a problem restoring your work', 'error');
    }
  });
}

// Batch update works (for select works and carousel)
function batchUpdateWorks(field, value) {
  if (selectedWorks.length === 0) return;

  console.log(`Batch updating ${selectedWorks.length} works. Setting ${field} to ${value}`);

  // Show loading spinner
  $('#loadingSpinner').show();

  let updatePromises = selectedWorks.map(id => {
    return new Promise((resolve, reject) => {
      const queryString = `id=${id}&${field}=${value}`;

      $.ajax({
        url: '../actions/picturesAPI.php',
        type: 'PATCH',
        data: queryString,
        contentType: 'application/x-www-form-urlencoded',
        success: function(response) {
          resolve(response);
        },
        error: function(xhr, status, error) {
          reject(error);
        }
      });
    });
  });

  Promise.all(updatePromises)
      .then(() => {
        console.log("Batch update completed successfully");

        // Hide loading spinner
        $('#loadingSpinner').hide();

        // Clear selection
        $('.work-card').removeClass('selected');
        updateSelectedCount();

        // Refresh the current view
        getAllWorks(pageNumber);

        // Show success message
        const operation = field === 'selectWork' ? 'Select Works' : 'Carousel';
        showToast(`${selectedWorks.length} works have been added to ${operation}!`, 'success');

        // Update statistics
        countWorksStatistics();
      })
      .catch(error => {
        console.error("Batch update failed:", error);

        // Hide loading spinner
        $('#loadingSpinner').hide();

        // Show error message
        showToast('There was a problem updating the works', 'error');
      });
}

// Batch delete works
function batchDeleteWorks() {
  if (selectedWorks.length === 0) return;

  console.log(`Batch deleting ${selectedWorks.length} works`);

  // Show loading spinner
  $('#loadingSpinner').show();

  let deletePromises = selectedWorks.map(id => {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: '../actions/picturesAPI.php',
        type: 'DELETE',
        data: `id=${id}`,
        contentType: 'application/x-www-form-urlencoded',
        success: function(response) {
          resolve(response);
        },
        error: function(xhr, status, error) {
          reject(error);
        }
      });
    });
  });

  Promise.all(deletePromises)
      .then(() => {
        console.log("Batch delete completed successfully");

        // Hide loading spinner
        $('#loadingSpinner').hide();

        // Clear selection
        $('.work-card').removeClass('selected');
        updateSelectedCount();

        // Refresh the current view
        getAllWorks(pageNumber);

        // Show success message
        showToast(`${selectedWorks.length} works have been deleted!`, 'success');

        // Update statistics
        countWorksStatistics();
      })
      .catch(error => {
        console.error("Batch delete failed:", error);

        // Hide loading spinner
        $('#loadingSpinner').hide();

        // Show error message
        showToast('There was a problem deleting the works', 'error');
      });
}

// Show toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.querySelector('.toast-container');
  const toast = document.createElement('div');
  toast.className = 'custom-toast';

  // Set toast background color based on type
  let bgColor, icon;
  switch (type) {
    case 'success':
      bgColor = '#2ecc71';
      icon = 'fas fa-check-circle';
      break;
    case 'error':
      bgColor = '#e74c3c';
      icon = 'fas fa-exclamation-circle';
      break;
    case 'warning':
      bgColor = '#f39c12';
      icon = 'fas fa-exclamation-triangle';
      break;
    default:
      bgColor = '#3498db';
      icon = 'fas fa-info-circle';
  }

  // Create toast content
  toast.innerHTML = `
        <div class="p-3 d-flex align-items-center" style="background-color: ${bgColor}; color: white;">
            <i class="${icon} me-2" style="font-size: 1.5rem;"></i>
            <div>${message}</div>
            <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

  // Add event listener to close button
  const closeButton = toast.querySelector('.btn-close');
  closeButton.addEventListener('click', () => {
    toast.remove();
  });

  // Add toast to container
  toastContainer.appendChild(toast);

  // Auto-remove toast after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 5000);
}

// Show confirmation modal
function showConfirmationModal(title, message, confirmCallback) {
  // Set modal content
  document.getElementById('confirmationTitle').textContent = title;
  document.getElementById('confirmationMessage').textContent = message;

  // Set confirm button action
  document.getElementById('confirmActionBtn').onclick = function() {
    try {
      var modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
      if (modal) {
        modal.hide();
      } else {
        $('#confirmationModal').modal('hide');
      }
    } catch(e) {
      console.error("Error closing modal:", e);
      $('#confirmationModal').modal('hide');
    }

    confirmCallback();
  };

  // Show modal
  try {
    var modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    modal.show();
  } catch(e) {
    console.error("Error showing confirmation modal:", e);
    if (confirm(message)) {
      confirmCallback();
    }
  }
}