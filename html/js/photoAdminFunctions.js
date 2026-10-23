// Global variables
var pageNumber = 'Select Works'; // Default view
var originalWorks = [];
var currentWorks = []; // Store current works data
var selectedWorks = []; // Store selected works for batch operations
var currentFilters = {
  search: '',
  medium: '',
  tag: 'all',
  project: ''
};
var currentSort = 'order-desc'; // Default sort order
var allProjects = [];
var filteredProjects = [];
var currentWorkAssociatedProjects = [];


$(document).ready(function() {
  // Initialize the page
  loadAndDisplayProjectTitles();
  countWorksStatistics();

  // Initialize event listeners
  initializeEventListeners();

  $('button[data-bs-target="#create-projects-pane"]').on('click', function() {
    loadCreateProjects();
  });

  // Project search functionality for create modal
  $('#createProjectSearch').on('input', function() {
    filterCreateProjects($(this).val().toLowerCase());
  });

  // Select all projects checkbox for create modal
  $('#createSelectAllProjects').on('change', function() {
    const isChecked = $(this).prop('checked');
    $('#createProjectsList input[type="checkbox"]').prop('checked', isChecked);
  });

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

  $('button[data-bs-target="#projects-pane"]').on('click', function() {
    loadProjectsForWork($('#photoId').val());
  });

  // Project search functionality
  $('#projectSearch').on('input', function() {
    filterProjects($(this).val().toLowerCase());
  });

  // Select all projects checkbox
  $('#selectAllProjects').on('change', function() {
    const isChecked = $(this).prop('checked');
    $('#projectsList input[type="checkbox"]').prop('checked', isChecked);
  });

  // Save project associations button
  $('#saveProjectAssociations').on('click', function() {
    saveWorkProjectAssociations();
  });
});

function loadCreateProjects() {
  // Show loading indicator
  $('#createProjectsList').html(`
    <li class="list-group-item text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading projects...</span>
      </div>
      <p class="mt-2 text-muted">Loading projects...</p>
    </li>
  `);

  // Reset search field and select all checkbox
  $('#createProjectSearch').val('');
  $('#createSelectAllProjects').prop('checked', false);

  // Load all active projects
  $.ajax({
    url: "../actions/projectsAPI.php",
    type: "GET",
    data: {activity: 'active'},
    dataType: "json",
    success: function(projects) {
      window.createAllProjects = projects;
      window.createFilteredProjects = [...projects];

      // Display the projects with checkboxes
      populateCreateProjectsList(window.createFilteredProjects);
    },
    error: function(xhr, status, error) {
      console.error('Error fetching projects:', error);
      $('#createProjectsList').html(`
        <li class="list-group-item text-danger">
          <i class="fas fa-exclamation-circle"></i> Failed to load projects: ${error}
        </li>
      `);
    }
  });
}

function populateCreateProjectsList(projects) {
  if (!projects || projects.length === 0) {
    $('#createProjectsList').html(`
      <li class="list-group-item text-muted" style="background-color: #343a40; color: #ffffff;">
        <i class="fas fa-info-circle"></i> No active projects found.
      </li>
    `);
    return;
  }

  let listItems = '';
  projects.forEach(function(project) {
    listItems += `
      <li class="list-group-item d-flex align-items-center" style="background-color: #343a40; color: #ffffff; border-color: #495057;">
        <div class="form-check">
          <input class="form-check-input create-project-checkbox" type="checkbox" value="" 
            id="create-project-${project.id}" data-project-id="${project.id}">
          <label class="form-check-label ms-2" for="create-project-${project.id}" style="color: #ffffff;">
            ${project.title}
          </label>
        </div>
        ${project.isCurrentProject == 1 ? '<span class="badge bg-primary ms-2">Current Project</span>' : ''}
      </li>
    `;
  });

  $('#createProjectsList').html(listItems);

  // Add click event for the list items (excluding the checkbox)
  $('#createProjectsList .list-group-item').click(function(e) {
    if (!$(e.target).hasClass('form-check-input')) {
      const checkbox = $(this).find('input[type="checkbox"]');
      checkbox.prop('checked', !checkbox.prop('checked'));
      updateCreateSelectAllCheckbox();
    }
  });

  // Add change event for checkboxes
  $('.create-project-checkbox').change(function() {
    updateCreateSelectAllCheckbox();
  });
}

// Update the select all checkbox based on individual selections for create modal
function updateCreateSelectAllCheckbox() {
  const totalCheckboxes = $('#createProjectsList input[type="checkbox"]').length;
  const checkedCheckboxes = $('#createProjectsList input[type="checkbox"]:checked').length;

  if (totalCheckboxes === 0) {
    $('#createSelectAllProjects').prop('checked', false);
  } else if (checkedCheckboxes === 0) {
    $('#createSelectAllProjects').prop('checked', false);
    $('#createSelectAllProjects').prop('indeterminate', false);
  } else if (checkedCheckboxes === totalCheckboxes) {
    $('#createSelectAllProjects').prop('checked', true);
    $('#createSelectAllProjects').prop('indeterminate', false);
  } else {
    $('#createSelectAllProjects').prop('checked', false);
    $('#createSelectAllProjects').prop('indeterminate', true);
  }
}

function filterCreateProjects(searchTerm) {
  if (!window.createAllProjects || window.createAllProjects.length === 0) {
    return;
  }

  if (!searchTerm) {
    // If search is empty, show all projects
    window.createFilteredProjects = [...window.createAllProjects];
  } else {
    // Filter projects based on search term
    window.createFilteredProjects = window.createAllProjects.filter(function(project) {
      return project.title.toLowerCase().includes(searchTerm) ||
          (project.description && project.description.toLowerCase().includes(searchTerm));
    });
  }

  // Update the projects list
  populateCreateProjectsList(window.createFilteredProjects);
}

function getSelectedCreateProjects() {
  const selectedProjects = [];
  $('#createProjectsList input[type="checkbox"]:checked').each(function() {
    selectedProjects.push($(this).data('project-id'));
  });
  return selectedProjects;
}


function loadProjectsForWork(workId) {
  if (!workId) {
    console.error('No work ID provided');
    return;
  }

  // Show loading indicator
  $('#projectsList').html(`
    <li class="list-group-item text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading projects...</span>
      </div>
      <p class="mt-2 text-muted">Loading projects...</p>
    </li>
  `);

  // Reset search field and select all checkbox
  $('#projectSearch').val('');
  $('#selectAllProjects').prop('checked', false);

  // First load all active projects
  $.ajax({
    url: "../actions/projectsAPI.php",
    type: "GET",
    data: {activity: 'active'},
    dataType: "json",
    success: function(projects) {
      allProjects = projects;
      filteredProjects = [...projects];

      // Then get the projects associated with this work
      fetchProjectsForWork(workId).then(function(associatedProjectIds) {
        currentWorkAssociatedProjects = associatedProjectIds;

        // Display the projects with appropriate checkboxes
        populateProjectsList(filteredProjects);

        // Check the projects that are associated with this work
        checkProjectCheckboxes(associatedProjectIds);
      }).catch(function(error) {
        console.error('Error fetching associated projects:', error);
        $('#projectsList').html(`
          <li class="list-group-item text-danger">
            <i class="fas fa-exclamation-circle"></i> Failed to load associated projects.
          </li>
        `);
      });
    },
    error: function(xhr, status, error) {
      console.error('Error fetching projects:', error);
      $('#projectsList').html(`
        <li class="list-group-item text-danger">
          <i class="fas fa-exclamation-circle"></i> Failed to load projects: ${error}
        </li>
      `);
    }
  });
}

function fetchProjectsForWork(workId) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      url: '../actions/worksOfProjectsAPI.php',
      type: 'GET',
      data: {'workId': workId},
      dataType: 'json',
      success: function(response) {
        resolve(response);
      },
      error: function(xhr, status, error) {
        // If the endpoint doesn't support workId yet, return empty array
        if (xhr.status === 400) {
          console.warn('API does not support workId parameter yet, returning empty array');
          resolve([]);
        } else {
          reject(error);
        }
      }
    });
  });
}

// Populate the projects list with checkboxes
function populateProjectsList(projects) {
  if (!projects || projects.length === 0) {
    $('#projectsList').html(`
      <li class="list-group-item text-muted">
        <i class="fas fa-info-circle"></i> No active projects found.
      </li>
    `);
    return;
  }

  let listItems = '';
  projects.forEach(function(project) {
    listItems += `
      <li class="list-group-item d-flex align-items-center">
        <div class="form-check">
          <input class="form-check-input project-checkbox" type="checkbox" value="" 
            id="project-${project.id}" data-project-id="${project.id}">
          <label class="form-check-label ms-2" for="project-${project.id}">
            ${project.title}
          </label>
        </div>
        ${project.isCurrentProject == 1 ? '<span class="badge bg-primary ms-2">Current Project</span>' : ''}
      </li>
    `;
  });

  $('#projectsList').html(listItems);

  // Add click event for the list items (excluding the checkbox)
  $('.list-group-item').click(function(e) {
    if (!$(e.target).hasClass('form-check-input')) {
      const checkbox = $(this).find('input[type="checkbox"]');
      checkbox.prop('checked', !checkbox.prop('checked'));
      updateSelectAllCheckbox();
    }
  });

  // Add change event for checkboxes
  $('.project-checkbox').change(function() {
    updateSelectAllCheckbox();
  });
}

// Check project checkboxes based on associations
function checkProjectCheckboxes(projectIds) {
  // First uncheck all checkboxes
  $('#projectsList input[type="checkbox"]').prop('checked', false);

  // Check boxes for associated projects
  projectIds.forEach(function(projectId) {
    $(`#project-${projectId}`).prop('checked', true);
  });

  // Update select all checkbox state
  updateSelectAllCheckbox();
}

// Update the select all checkbox based on individual selections
function updateSelectAllCheckbox() {
  const totalCheckboxes = $('#projectsList input[type="checkbox"]').length;
  const checkedCheckboxes = $('#projectsList input[type="checkbox"]:checked').length;

  if (totalCheckboxes === 0) {
    $('#selectAllProjects').prop('checked', false);
  } else if (checkedCheckboxes === 0) {
    $('#selectAllProjects').prop('checked', false);
    $('#selectAllProjects').prop('indeterminate', false);
  } else if (checkedCheckboxes === totalCheckboxes) {
    $('#selectAllProjects').prop('checked', true);
    $('#selectAllProjects').prop('indeterminate', false);
  } else {
    $('#selectAllProjects').prop('checked', false);
    $('#selectAllProjects').prop('indeterminate', true);
  }
}

// Filter projects based on search input
function filterProjects(searchTerm) {
  if (!allProjects || allProjects.length === 0) {
    return;
  }

  if (!searchTerm) {
    // If search is empty, show all projects
    filteredProjects = [...allProjects];
  } else {
    // Filter projects based on search term
    filteredProjects = allProjects.filter(function(project) {
      return project.title.toLowerCase().includes(searchTerm) ||
          (project.description && project.description.toLowerCase().includes(searchTerm));
    });
  }

  // Update the projects list
  populateProjectsList(filteredProjects);

  // Reapply checkboxes for the current work
  checkProjectCheckboxes(currentWorkAssociatedProjects);
}

// Save work-project associations
function saveWorkProjectAssociations() {
  const workId = $('#photoId').val();
  if (!workId) {
    showToast('No work selected', 'error');
    return;
  }

  // Get all checked project IDs
  const selectedProjects = [];
  $('#projectsList input[type="checkbox"]:checked').each(function() {
    selectedProjects.push($(this).data('project-id'));
  });

  // Check if anything changed - make sure we handle null/undefined arrays
  const existingProjects = currentWorkAssociatedProjects || [];
  if (arraysEqual(selectedProjects.sort(), existingProjects.sort())) {
    showToast('No changes in project associations', 'info');
    return;
  }

  // Show loading indicator
  const $saveButton = $('#saveProjectAssociations');
  const originalButtonText = $saveButton.html();
  $saveButton.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Saving...
    `);

  // jQuery's ajax will automatically remove empty arrays from POST data
  // So we'll stringify the array to ensure it's sent properly
  $.ajax({
    url: '../actions/worksOfProjectsAPI.php',
    type: 'POST',
    data: {
      'workId': workId,
      'projectIds': JSON.stringify(selectedProjects)  // Stringify to preserve empty arrays
    },
    dataType: 'json',
    success: function(response) {
      currentWorkAssociatedProjects = selectedProjects;
      showToast('Project associations saved successfully', 'success');
    },
    error: function(xhr, status, error) {
      console.error('Error saving project associations:', error);
      console.error('Response:', xhr.responseText);
      showToast('Failed to save project associations', 'error');
    },
    complete: function() {
      // Restore button state
      $saveButton.prop('disabled', false).html(originalButtonText);
    }
  });
}

// Helper function to check if two arrays have the same elements
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

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

  // Completely refresh the view to restore all the original click handlers
  // This ensures all cards get proper event handlers reapplied
  insertData(currentWorks);
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
      originalWorks = [...data]; // Store a copy of the original dataset
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

// Refresh the grid while respecting the active project filter
function refreshCurrentView() {
  if (currentFilters.project && currentFilters.project !== null) {
    getProjectWorks(currentFilters.project);
  } else {
    getAllWorks(pageNumber);
  }
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

      // Add "All Projects" option
      dropdown.append($('<option>').text('All Projects').val('all'));

      projects.forEach(function(project) {
        let title = project.title;
        let option = $('<option>').text(title).val(title);
        dropdown.append(option);
      });

      // Event listener for project selection
      dropdown.change(function() {
        let selectedTitle = $(this).val();
        if (selectedTitle === 'all') {
          // Clear project filter and get all works
          currentFilters.project = null;
          getAllWorks(pageNumber); // Assuming we start with page 1
        } else if (selectedTitle) {
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
  //pageNumber = 'active';
  whichProject = {
    project: project
  };

  $.ajax({
    url: "../actions/getWorksForPictureAdminBS.php",
    type: "GET",
    data: whichProject,
    dataType: "json",
    success: function(data) {
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
    originalWorks = [...allWorks]; // Store original project works
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
    case 'upload-newest':
      return items.sort((a, b) => (b.id || 0) - (a.id || 0));
    case 'upload-oldest':
      return items.sort((a, b) => (a.id || 0) - (b.id || 0));
    default:
      return items;
  }
}

// Modify the applyFilters function to always start with the original dataset
function applyFilters() {
  if (!originalWorks || originalWorks.length === 0) return;

  // Start with the original dataset every time
  let filteredWorks = [...originalWorks];

  // Apply search filter
  if (currentFilters.search && currentFilters.search.trim() !== '') {
    const searchTerms = currentFilters.search.toLowerCase().trim();

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

  }

  // Apply medium filter
  if (currentFilters.medium && currentFilters.medium !== '') {
    filteredWorks = filteredWorks.filter(work => work.medium === currentFilters.medium);
  }

  // Apply tag filter
  if (currentFilters.tag && currentFilters.tag !== 'all') {
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

      if (Array.isArray(data)) {
        const totalVisible = data.filter(work => work.visible == 1).length;
        const selectWorks = data.filter(work => work.isSelectWork == 1 && work.visible == 1).length;
        const carousel = data.filter(work => work.carousel == 1 && work.visible == 1).length;

        $('#totalWorksCount').text(totalVisible);
        $('#selectWorksCount').text(selectWorks);
        $('#carouselWorksCount').text(carousel);

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
      ? '<button type="button" class="btn btn-info" id="restoreWorkBtn"><i class="fas fa-trash-restore me-1"></i> Restore</button> '
        + '<button type="button" class="btn btn-danger" id="hardDeleteWorkBtn"><i class="fas fa-times-circle me-1"></i> Delete Permanently</button>'
      : '<button type="button" class="btn btn-danger" id="deleteWorkBtn"><i class="fas fa-trash me-1"></i> Delete</button>';

  // Set event listener for restore button if visible
  if (visible == 0) {
    $('#restoreWorkBtn').click(function() {
      restoreWork();
    });

    $('#hardDeleteWorkBtn').click(function() {
      showConfirmationModal(
          'Delete Permanently',
          'This will permanently delete the image file, its thumbnail, and its database entry. This cannot be undone. Are you sure?',
          function() {
            hardDeleteWork();
          }
      );
    });
  } else {
    // Add event listener for delete button - THIS FIXES THE DELETE ISSUE
    $('#deleteWorkBtn').click(function() {
      showConfirmationModal(
          'Delete Work',
          'Are you sure you want to delete this work? This will remove it from Select Works and Carousel.',
          function() {
            deleteWork();
          }
      );
    });
  }

  // Reset the active tab to details
  $('#workDetailsTabs button[data-bs-target="#details-pane"]').tab('show');

  // Reset the projects list
  $('#projectsList').html(`
    <li class="list-group-item text-center">
      <p class="text-muted">Select the "Associated Projects" tab to load projects</p>
    </li>
  `);

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

  // Reset the active tab to details
  $('#workCreateTabs button[data-bs-target="#create-details-pane"]').tab('show');

  // Reset the projects list
  $('#createProjectsList').html(`
    <li class="list-group-item text-center" style="background-color: #343a40; color: #ffffff; border-color: #495057;">
      <p style="color: #a8c7e0 !important;">Click the "Associated Projects" tab to load projects</p>
    </li>
  `);

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
// Modified postPhoto function to handle project associations
function postPhoto() {
  console.log("Starting upload process...");

  // Required field validation
  if (!$('#photoPostName').val()) {
    showToast('Please enter a name for the work', 'warning');
    return;
  }

  if (!$('#photoPostCreationYear').val()) {
    showToast('Please enter a creation year for the work', 'warning');
    return;
  }

  var fileInput = $('#photoPostUpload')[0].files[0];
  if (!fileInput) {
    showToast('Please select an image file', 'warning');
    return;
  }

  let isColor = $('input[name=isColorPost]:checked').val();
  let isAvailable = $('input[name=isAvailablePost]:checked').val();
  let isCarousel = $('input[name=isCarouselPost]:checked').val();
  let isSelectWork = $('input[name=isSelectWorksPost]:checked').val();

  let colorInt = isColor === 'true' ? 1 : 0;
  let availableInt = isAvailable === 'true' ? 1 : 0;
  let carouselInt = isCarousel === 'true' ? 1 : 0;
  let selectWorkInt = isSelectWork === 'true' ? 1 : 0;

  // Get selected projects
  const selectedProjects = getSelectedCreateProjects();

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
    dataType: 'json',
    success: function(response) {
      if (!response || !response.success) {
        uploadFailed(response && response.message);
        return;
      }

      // Check if we have selected projects to associate
      if (selectedProjects.length > 0 && response.id) {
        associateNewWorkWithProjects(response.id, selectedProjects);
      } else {
        showToast('Your work has been uploaded!', 'success');
        finishWorkCreation();
      }
    },
    error: function(xhr) {
      console.error("Upload failed:", xhr.status, xhr.responseText);
      uploadFailed(xhr.responseJSON && xhr.responseJSON.message);
    }
  });
}

// Keeps the form open, with everything she typed, and says why
function uploadFailed(reason) {
  $('#loadingSpinner').hide();
  document.getElementById('uploadWorkButton').disabled = false;
  showToast('The work was not uploaded. ' + (reason || 'Please try again.'), 'error');
}

function associateNewWorkWithProjects(workId, projectIds) {
  console.log("Associating work ID", workId, "with projects:", projectIds);

  $.ajax({
    url: '../actions/worksOfProjectsAPI.php',
    type: 'POST',
    data: {
      'workId': workId,
      'projectIds': JSON.stringify(projectIds)  // Stringify to preserve empty arrays
    },
    dataType: 'json',
    success: function(response) {
      console.log("Project associations saved successfully:", response);
      showToast('Work created and associated with projects successfully', 'success');
      finishWorkCreation();
    },
    error: function(xhr, status, error) {
      console.error('Error saving project associations:', error);
      console.error('Response:', xhr.responseText);
      showToast('Work created but project associations failed', 'warning');
      finishWorkCreation();
    }
  });
}

function finishWorkCreation() {
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
  refreshCurrentView();

  // Update statistics
  countWorksStatistics();
}

// Update an existing work
// Update the updateWork function in photoAdminFunctions.js
function updateWork() {
  console.log("Starting work update...");

  // Required field validation for update
  if (!$('#photoName').val()) {
    showToast('Please enter a name for the work', 'warning');
    return;
  }

  if (!$('#photoCreationYear').val()) {
    showToast('Please enter a creation year for the work', 'warning');
    return;
  }

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

  // Get the work ID and collect selected projects
  const workId = $('#photoId').val();
  const selectedProjects = [];
  $('#projectsList input[type="checkbox"]:checked').each(function() {
    selectedProjects.push($(this).data('project-id'));
  });

  // Send the form data via AJAX
  $.ajax({
    url: '../actions/picturesAPI.php',
    type: 'PATCH',
    data: queryString,
    contentType: 'application/x-www-form-urlencoded',
    success: function(response) {
      console.log("Update successful. Response:", response);

      // If projects tab has been loaded and we have projects selected
      if ($('#projectsList').children().length > 0) {
        // Save project associations
        $.ajax({
          url: '../actions/worksOfProjectsAPI.php',
          type: 'POST',
          data: {
            'workId': workId,
            'projectIds': selectedProjects
          },
          dataType: 'json'
        });
      }

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
      refreshCurrentView();

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
      refreshCurrentView();

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

// Permanently delete a work: removes the image + thumbnail from the server
// and the row from the database (picturesAPI DELETE with mode=hard)
function hardDeleteWork() {
  console.log("Starting hard delete operation...");

  $('#loadingSpinner').show();

  var workId = $('#photoId').val();
  console.log("Permanently deleting work ID:", workId);

  $.ajax({
    url: '../actions/picturesAPI.php',
    type: 'DELETE',
    data: "id=" + workId + "&mode=hard",
    contentType: 'application/x-www-form-urlencoded',
    dataType: 'json',
    success: function(response) {
      console.log("Hard delete response:", response);

      $('#loadingSpinner').hide();

      if (!response.success) {
        showToast('Could not permanently delete: ' + (response.message || 'unknown error'), 'error');
        return;
      }

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
      refreshCurrentView();

      var detail = response.fileKept
          ? ' (image file kept — still used by another work)'
          : '';
      showToast('The work has been permanently deleted!' + detail, 'success');

      // Update statistics
      countWorksStatistics();
    },
    error: function(xhr, status, error) {
      console.error("Hard delete failed. Status:", status);
      console.error("Error:", error);
      console.error("Response:", xhr.responseText);

      $('#loadingSpinner').hide();
      showToast('There has been a problem permanently deleting this work', 'error');
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
      refreshCurrentView();

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

  // Send a single request with all IDs instead of multiple requests
  $.ajax({
    url: '../actions/picturesAPI.php?action=batch',
    type: 'PATCH',
    data: `ids=${JSON.stringify(selectedWorks)}&${field}=${value}`,
    contentType: 'application/x-www-form-urlencoded',
    success: function(response) {
      console.log("Batch update completed successfully", response);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Clear selection
      $('.work-card').removeClass('selected');
      updateSelectedCount();

      // Refresh the current view
      refreshCurrentView();

      // Show success message
      const operation = field === 'selectWork' ? 'Select Works' : 'Carousel';
      showToast(`${selectedWorks.length} works have been added to ${operation}!`, 'success');

      // Update statistics
      countWorksStatistics();
    },
    error: function(xhr, status, error) {
      console.error("Batch update failed:", error);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Show error message
      showToast('There was a problem updating the works', 'error');
    }
  });
}

function batchDeleteWorks() {
  if (selectedWorks.length === 0) return;

  console.log(`Batch deleting ${selectedWorks.length} works`);

  // Show loading spinner
  $('#loadingSpinner').show();

  // Use a single request for batch deletion
  $.ajax({
    url: '../actions/picturesAPI.php?action=batch',
    type: 'DELETE',
    data: `ids=${JSON.stringify(selectedWorks)}`,
    contentType: 'application/x-www-form-urlencoded',
    success: function(response) {
      console.log("Batch delete completed successfully", response);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Clear selection
      $('.work-card').removeClass('selected');
      updateSelectedCount();

      // Refresh the current view
      refreshCurrentView();

      // Show success message
      showToast(`${selectedWorks.length} works have been deleted!`, 'success');

      // Update statistics
      countWorksStatistics();
    },
    error: function(xhr, status, error) {
      console.error("Batch delete failed:", error);

      // Hide loading spinner
      $('#loadingSpinner').hide();

      // Show error message
      showToast('There was a problem deleting the works', 'error');
    }
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