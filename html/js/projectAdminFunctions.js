var pageNumber = 'active';
var allProjects = [];
var projectCounts = {
    active: 0,
    inactive: 0,
    deleted: 0
};
var allWorks = [];
var filteredWorks = [];

// IDs are kept as strings everywhere on this page: the API sends numbers,
// but checkboxes and form fields always hold text, and a strict comparison
// between the two never matches.
var editingProjectId = null;    // project open in the edit window
var worksLoadedFor = null;      // project whose works list finished loading
var savedWorkIds = [];          // that project's works as stored in the database
var selectedWorkIds = new Set(); // what is ticked, kept apart from what is on screen

function toIdList(ids) {
    return (Array.isArray(ids) ? ids : []).map(String);
}

$(document).ready(function () {
    updateAllProjectCounts();
    getProjects(pageNumber);

    // Initialize search functionality
    $('#projectSearch').on('input', function() {
        filterProjects($(this).val().toLowerCase());
    });

    $('#workSearch').on('input', function() {
        filterWorks($(this).val().toLowerCase());
    });

    // Select all works checkbox (only the works currently shown by the search)
    $('#selectAllWorks').on('change', function() {
        const isChecked = $(this).prop('checked');
        $('#worksList input[type="checkbox"]').each(function() {
            $(this).prop('checked', isChecked);
            setWorkSelected($(this).attr('data-work-id'), isChecked);
        });
    });

    // Forget the open project when the edit window closes, so a slow
    // response for it can't land in the next project's window
    $('#projectUpdateModal').on('hidden.bs.modal', function() {
        editingProjectId = null;
        worksLoadedFor = null;
    });

    // Set active button state
    $('.btn-group button').on('click', function() {
        $('.btn-group button').removeClass('active');
        $(this).addClass('active');
    });
});

function getProjects(activity) {
    // Show loading state
    $('#existingPostInformation').html(`
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
            </div>
            <p class="mt-3">Loading projects...</p>
        </div>
    `);

    pageNumber = activity;
    var activityData = {activity: activity};

    // Set active button
    $('.btn-group button').removeClass('active');
    if (activity === 'active') {
        $('#activeBtn').addClass('active');
    } else if (activity === 'inactive') {
        $('#inactiveBtn').addClass('active');
    } else if (activity === 'deleted') {
        $('#deletedBtn').addClass('active');
    }

    $.ajax({
        url: "../actions/projectsAPI.php",
        type: "GET",
        data: activityData,
        dataType: "json",
        success: function (data) {
            data = data.map(project => ({ ...project, id: String(project.id) }));
            allProjects = data.map(project => ({
                ...project,
                works: []  // Filled in below with this project's work IDs
            }));

            insertData(data);

            // Fetch each project's works for the count bubbles and "Also in" labels
            allProjects.forEach(project => {
                fetchWorkIdsForProject(project.id).then(workIds => {
                    project.works = toIdList(workIds);
                    updateWorksCountBadge(project.id, project.works.length);
                }, error => {
                    console.error(`Error fetching works for project ${project.id}:`, error);
                });
            });

            // Clear any existing search filter
            $('#projectSearch').val('');
        },
        error: function (xhr, status, error) {
            console.log("An error occurred: " + error);
            showToast('Failed to load projects. Please try again.', 'error');
            $('#existingPostInformation').html(`
                <div class="col-12 text-center py-5">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i> Failed to load projects.
                        <button class="btn btn-outline-danger mt-3" onclick="getProjects('${pageNumber}')">
                            <i class="fas fa-sync"></i> Try Again
                        </button>
                    </div>
                </div>
            `);
        },
    });
}

function updateProjectCounts() {
    // Count projects by status
    projectCounts.active = allProjects.filter(p => p.active == 1 && p.deleted == 0).length;
    projectCounts.inactive = allProjects.filter(p => p.active == 0 && p.deleted == 0).length;
    projectCounts.deleted = allProjects.filter(p => p.deleted == 1).length;

    // Update the UI
    $('#activeCount').text(projectCounts.active);
    $('#inactiveCount').text(projectCounts.inactive);
    $('#deletedCount').text(projectCounts.deleted);
}

function insertData(data) {
    let items = data;
    $('#existingPostInformation').empty();

    if (items.length === 0) {
        $('#existingPostInformation').html(`
            <div class="col-12 text-center py-5">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> No projects found.
                </div>
            </div>
        `);
        return;
    }

    items.forEach(function (item) {
        let id = item.id;
        let title = item.title;
        let description = item.description;
        let orderOfDisplay = item.orderOfDisplay;
        let active = item.active;
        let deleted = item.deleted;
        let isCurrentProject = item.isCurrentProject;

        // Determine status badge
        let statusBadge = '';
        let statusClass = '';

        if (deleted == 1) {
            statusBadge = '<span class="badge badge-deleted">Deleted</span>';
            statusClass = 'status-deleted';
        } else if (active == 1) {
            statusBadge = '<span class="badge badge-active">Active</span>';
            statusClass = 'status-active';
        } else {
            statusBadge = '<span class="badge badge-inactive">Inactive</span>';
            statusClass = 'status-inactive';
        }

        // Add current project badge if applicable
        let currentBadge = '';
        if (isCurrentProject == 1 && deleted == 0) {
            currentBadge = '<span class="badge badge-current">Current Project</span>';
            if (active == 1) {
                statusClass = 'status-current';
            }
        }

        // Find the works count for this project
        const worksCount = allProjects.find(p => p.id === id)?.works?.length || 0;
        const worksCountBadge = `<span class="works-count" title="${worksCount} works associated">${worksCount}</span>`;

        // Create the card HTML
        const cardHtml = `
            <div class="col-md-4 mb-4">
                <div class="card project-card shadow-grow position-relative" data-id="${id}">
                    <div class="status-indicator ${statusClass}"></div>
                    <div class="card-body">
                        <h5 class="card-title" style="color: #ffffff;">${title} ${worksCountBadge}</h5>
                        <div class="mb-3">
                            ${statusBadge} ${currentBadge}
                        </div>
                        <p class="card-text"><strong>ID:</strong> ${id}</p>
                        <p class="card-text"><strong>Order:</strong> ${orderOfDisplay}</p>
                        <button class="btn btn-sm btn-outline-light mt-2 edit-project-btn">
                            <i class="fas fa-edit"></i> Edit Project
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Append the card to the container
        $('#existingPostInformation').append(cardHtml);

        // Add click event to the card
        $(`[data-id="${id}"]`).click(function(e) {
            if (!$(e.target).hasClass('edit-project-btn') &&
                !$(e.target).parent().hasClass('edit-project-btn')) {
                openProjectInfo(id, title, description, active, orderOfDisplay, deleted, isCurrentProject);
            }
        });

        // Add click event to the edit button
        $(`[data-id="${id}"] .edit-project-btn`).click(function(e) {
            e.stopPropagation();
            openProjectInfo(id, title, description, active, orderOfDisplay, deleted, isCurrentProject);
        });
    });
}

function filterProjects(searchTerm) {
    if (!searchTerm) {
        // If search is empty, show all projects
        $('.project-card').parent().show();
        return;
    }

    // Filter cards based on search term
    $('.project-card').each(function() {
        const card = $(this);
        const cardText = card.text().toLowerCase();

        if (cardText.includes(searchTerm)) {
            card.parent().show();
        } else {
            card.parent().hide();
        }
    });
}

function openProjectInfo(id, title, description, active, orderOfDisplay, deleted, isCurrentProject) {
    // Prevent multiple calls by checking if modal is already visible
    if ($('#projectUpdateModal').hasClass('show')) return;

    id = String(id);
    editingProjectId = id;
    worksLoadedFor = null;
    savedWorkIds = [];
    selectedWorkIds = new Set();

    // Show loading state in works list
    $('#worksList').html(`
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading works...</span>
            </div>
        </div>
    `);

    // Reset search and select all checkbox
    $('#workSearch').val('');
    $('#selectAllWorks').prop('checked', false).prop('indeterminate', false);

    // Set delete/restore button
    if (deleted == 1) {
        document.getElementById('deleteOrRestore').innerHTML = `
            <button type="button" class="btn btn-info" onclick="confirmRestore()">
                <i class="fas fa-trash-restore"></i> Restore Project
            </button>
        `;
    } else {
        document.getElementById('deleteOrRestore').innerHTML = `
            <button type="button" class="btn btn-danger" onclick="confirmDelete()">
                <i class="fas fa-trash-alt"></i> Delete Project
            </button>
        `;
    }

    // Set form values
    $('#projectId').val(id);
    $('#editProjectTitle').val(title);
    $('#editProjectDescription').val(description);
    $('#editOrderOfDisplay').val(orderOfDisplay);

    // Set radio buttons
    if (active == 1) {
        $('#editActiveYesPost').prop('checked', true);
    } else {
        $('#editActiveNoPost').prop('checked', true);
    }

    if (isCurrentProject == 1) {
        $('#editCurrentYesPost').prop('checked', true);
    } else {
        $('#editCurrentNoPost').prop('checked', true);
    }

    $('#projectUpdateModal').modal('show');

    // Default to the details tab
    $('#projectTabs a[href="#details"]').tab('show');

    loadWorksForProject(id);
}

function loadWorksForProject(projectId) {
    $.when(
        $.ajax({
            url: '../actions/picturesAPI.php',
            type: 'GET',
            data: {'theYear': 'everything'},
            dataType: 'json'
        }),
        fetchWorkIdsForProject(projectId)
    ).then(function(worksResponse, associatedResponse) {
        // The window was closed or another project opened meanwhile
        if (editingProjectId !== projectId) return;

        savedWorkIds = toIdList(associatedResponse[0]);
        selectedWorkIds = new Set(savedWorkIds);

        const project = allProjects.find(p => p.id === projectId);
        if (project) {
            project.works = savedWorkIds.slice();
        }

        // Projects normally hold Select Works. A work linked to this project
        // for any other reason is listed too, so it can be seen and unticked
        // rather than silently dropped.
        allWorks = worksResponse[0]
            .map(work => ({ ...work, id: String(work.id) }))
            .filter(work => (work.isSelectWork == 1 && work.visible == 1) || selectedWorkIds.has(work.id))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        worksLoadedFor = projectId;
        filterWorks($('#workSearch').val().toLowerCase());
    }, function(xhr, status, error) {
        if (editingProjectId !== projectId) return;
        console.error('Error fetching works:', error);
        $('#worksList').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Failed to load works: ${error || status}.
                The project's works will not be changed when you save.
            </div>
        `);
    });
}

function openPostForm() {
    // Reset the form
    $('#createProjectForm')[0].reset();

    // Default values
    $('#activeYesPost').prop('checked', true);
    $('#currentNoPost').prop('checked', true);
    $('#postOrderOfDisplay').val(1);

    // Show the modal
    $('#projectPostModal').modal('show');
}

function createProject() {
    // Validate only required fields (title is required, description is NOT)
    let isValid = true;

    // Check title field
    if (!$('#titlePostName').val().trim()) {
        $('#titlePostName').addClass('is-invalid');
        isValid = false;
    } else {
        $('#titlePostName').removeClass('is-invalid');
    }

    if (!isValid) {
        showToast('Please fill in the project title', 'error');
        return;
    }

    // Get form values
    let isActiveProject = $('input[name=isActivePost]:checked').val();
    let projectInt = isActiveProject === 'true' ? 1 : 0;

    let isCurrentProject = $('input[name=isCurrentProjectPost]:checked').val();
    let isCurrentProjectInt = isCurrentProject === 'true' ? 1 : 0;

    var postData = new FormData();
    postData.append('title', $('#titlePostName').val());
    postData.append('description', $('#projectDescription').val());
    postData.append('active', projectInt);
    postData.append('orderOfDisplay', $('#postOrderOfDisplay').val());
    postData.append('isCurrentProject', isCurrentProjectInt);

    // Disable the button to prevent multiple submissions
    $('#uploadWorkButton').prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Creating...
    `);

    $.ajax({
        url: '../actions/projectsAPI.php',
        type: 'POST',
        data: postData,
        processData: false,
        contentType: false,
        success: function (response) {
            showToast('Project successfully created!', 'success');
            updateAllProjectCounts();
            getProjects(pageNumber);
            $('#projectPostModal').modal('hide');

            // Reset the form
            $('#createProjectForm')[0].reset();
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            showToast('Failed to create project: ' + error, 'error');
        },
        complete: function() {
            // Re-enable the button
            $('#uploadWorkButton').prop('disabled', false).html(`
                <i class="fas fa-save"></i> Create Project
            `);
        }
    });
}

function updateWork() {
    // Validate only required fields (title is required, description is NOT)
    if (!$('#editProjectTitle').val().trim()) {
        $('#editProjectTitle').addClass('is-invalid');
        showToast('Please fill in the project title', 'error');
        return;
    }
    $('#editProjectTitle').removeClass('is-invalid');

    // Get form values
    let isActive = $('input[name=editIsActivePost]:checked').val();
    let activeInt = isActive === 'true' ? 1 : 0;

    let isCurrentProject = $('input[name=editIsCurrentProjectPost]:checked').val();
    let isCurrentProjectInt = isCurrentProject === 'true' ? 1 : 0;

    const projectId = String($('#projectId').val());

    var formData = {
        id: projectId,
        title: $('#editProjectTitle').val(),
        description: $('#editProjectDescription').val(),
        orderOfDisplay: $('#editOrderOfDisplay').val(),
        active: activeInt,
        isCurrentProject: isCurrentProjectInt,
    };

    // Works are only saved once the list has loaded, and only if changed
    const workIds = getWorksToSave(projectId);
    const worksNotLoaded = workIds === null;
    const worksChanged = !worksNotLoaded && worksHaveChanged(workIds);

    const $saveButton = $('#projectUpdateModal .modal-footer .btn-primary');
    const resetSaveButton = function() {
        $saveButton.prop('disabled', false).html(`
            <i class="fas fa-save"></i> Save Changes
        `);
    };
    $saveButton.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Saving...
    `);

    // First save the project details
    $.ajax({
        url: '../actions/projectsAPI.php',
        type: 'PATCH',
        data: formData,
        success: function () {
            if (worksChanged) {
                postWorksProjectsDB(projectId, workIds)
                    .then(function() {
                        showToast('Project and associated works successfully updated!', 'success');
                    }, function() {
                        showToast('Project updated, but its works could not be saved. Nothing was removed.', 'warning');
                    })
                    .always(function() {
                        getProjects(pageNumber);
                        updateAllProjectCounts();
                        $('#projectUpdateModal').modal('hide');
                        resetSaveButton();
                    });
            } else {
                getProjects(pageNumber);
                updateAllProjectCounts();
                showToast(worksNotLoaded
                    ? 'Project updated. Its works had not loaded, so they were left as they were.'
                    : 'Project successfully updated!', worksNotLoaded ? 'warning' : 'success');
                $('#projectUpdateModal').modal('hide');
                resetSaveButton();
            }
        },
        error: function (xhr, status, error) {
            showToast('Error updating project: ' + error, 'error');
            console.error('Error:', error);
            resetSaveButton();
        }
    });
}

function confirmDelete() {
    const projectTitle = $('#editProjectTitle').val();
    $('#confirmationMessage').text(`Are you sure you want to delete the project "${projectTitle}"? This action cannot be undone.`);

    // Set the action for the confirmation button
    $('#confirmActionBtn').off('click').on('click', function() {
        deleteWork();
        $('#confirmationModal').modal('hide');
    });

    $('#confirmationModal').modal('show');
}

function confirmRestore() {
    const projectTitle = $('#editProjectTitle').val();
    $('#confirmationMessage').text(`Are you sure you want to restore the project "${projectTitle}"?`);

    // Set the action for the confirmation button
    $('#confirmActionBtn').off('click').on('click', function() {
        restoreWork();
        $('#confirmationModal').modal('hide');
    });

    $('#confirmationModal').modal('show');
}

function deleteWork() {
    var formData = {
        id: $('#projectId').val(),
    };

    // Disable the delete button
    const $deleteButton = $('#deleteOrRestore button');
    $deleteButton.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Deleting...
    `);

    $.ajax({
        url: '../actions/projectsAPI.php',
        type: 'DELETE',
        data: formData,
        success: function (response) {
            getProjects(pageNumber);
            updateAllProjectCounts();
            showToast('Project successfully deleted!', 'success');
            $('#projectUpdateModal').modal('hide');
        },
        error: function (xhr, status, error) {
            showToast('Error deleting project: ' + error, 'error');
            console.error('Error:', error);
        },
        complete: function() {
            // Re-enable the button (although modal will be closed)
            $deleteButton.prop('disabled', false).html(`
                <i class="fas fa-trash-alt"></i> Delete Project
            `);
        }
    });
}

function restoreWork() {
    let isActive = $('input[name=editIsActivePost]:checked').val();
    let activeInt = isActive === 'true' ? 1 : 0;

    let isCurrentProject = $('input[name=editIsCurrentProjectPost]:checked').val();
    let isCurrentProjectInt = isCurrentProject === 'true' ? 1 : 0;

    var formData = {
        id: $('#projectId').val(),
        title: $('#editProjectTitle').val(),
        description: $('#editProjectDescription').val(),
        orderOfDisplay: $('#editOrderOfDisplay').val(),
        active: activeInt,
        isCurrentProject: isCurrentProjectInt,
        restore: 'restore'
    };

    // Disable the restore button
    const $restoreButton = $('#deleteOrRestore button');
    $restoreButton.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Restoring...
    `);

    $.ajax({
        url: '../actions/projectsAPI.php',
        type: 'PATCH',
        data: formData,
        success: function (response) {
            getProjects(pageNumber);
            updateAllProjectCounts();
            showToast('Project successfully restored!', 'success');
            $('#projectUpdateModal').modal('hide');
        },
        error: function (xhr, status, error) {
            showToast('Error restoring project: ' + error, 'error');
            console.error('Error:', error);
        },
        complete: function() {
            // Re-enable the button (although modal will be closed)
            $restoreButton.prop('disabled', false).html(`
                <i class="fas fa-trash-restore"></i> Restore Project
            `);
        }
    });
}

function filterWorks(searchTerm) {
    // Only redraw once the project's works have loaded
    if (worksLoadedFor === null || worksLoadedFor !== editingProjectId) return;

    if (!searchTerm) {
        filteredWorks = [...allWorks];
    } else {
        filteredWorks = allWorks.filter(work =>
            (work.name || '').toLowerCase().includes(searchTerm) ||
            (work.medium || '').toLowerCase().includes(searchTerm)
        );
    }

    populateWorksList(filteredWorks);
}

function addWorksToProject() {
    const projectId = String($('#projectId').val());
    const workIds = getWorksToSave(projectId);

    if (workIds === null) {
        showToast('The works list has not loaded yet, so nothing was saved.', 'error');
        return;
    }

    if (!worksHaveChanged(workIds)) {
        showToast('No changes in associated works.', 'info');
        return;
    }

    const $saveButton = $('#works .btn-primary');
    $saveButton.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Saving...
    `);

    return postWorksProjectsDB(projectId, workIds, $saveButton).then(function() {
        showToast('Works successfully associated with project!', 'success');
    }, function() {
        showToast('Failed to update associated works. Nothing was removed.', 'error');
    });
}


function postWorksProjectsDB(projectId, workIds, $button) {
    projectId = String(projectId);
    workIds = toIdList(workIds);

    return $.ajax({
        url: "../actions/worksOfProjectsAPI.php",
        type: "POST",
        data: {
            'projectId': projectId,
            'workIds': JSON.stringify(workIds)
        },
        dataType: "json",
        success: function () {
            savedWorkIds = workIds.slice();

            const project = allProjects.find(p => p.id === projectId);
            if (project) {
                project.works = workIds.slice();
            }

            updateWorksCountBadge(projectId, workIds.length);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log("An error occurred: " + textStatus + ", " + errorThrown);
        },
        complete: function() {
            if ($button) {
                $button.prop('disabled', false).html(`
                    <i class="fas fa-save"></i> Save Associated Works
                `);
            }
        }
    });
}

// Ensure the updateWorksCountBadge function is correctly updating the badge
function updateWorksCountBadge(projectId, count) {
    // Update the blue badge with the count
    $(`.project-card[data-id="${projectId}"] .works-count`).text(count);

    // If the count is 0, we might want to style it differently (optional)
    if (count === 0) {
        $(`.project-card[data-id="${projectId}"] .works-count`).addClass('empty-works');
    } else {
        $(`.project-card[data-id="${projectId}"] .works-count`).removeClass('empty-works');
    }
}

function fetchWorkIdsForProject(id) {
    return $.ajax({
        url: '../actions/worksOfProjectsAPI.php',
        type: 'GET',
        data: {'projectId': id},
        dataType: 'json'
    });
}

function updateSelectAllCheckbox() {
    const totalCheckboxes = $('#worksList input[type="checkbox"]').length;
    const checkedCheckboxes = $('#worksList input[type="checkbox"]:checked').length;

    if (totalCheckboxes === 0 || checkedCheckboxes === 0) {
        $('#selectAllWorks').prop('checked', false).prop('indeterminate', false);
    } else if (checkedCheckboxes === totalCheckboxes) {
        $('#selectAllWorks').prop('checked', true).prop('indeterminate', false);
    } else {
        $('#selectAllWorks').prop('checked', false).prop('indeterminate', true);
    }
}

function appendProjectInfo(workId, listItem, excludeProjectId = null) {
    // Find the other projects that contain this work
    const projects = allProjects.filter(p =>
        p.works && p.works.includes(String(workId)) &&
        p.id !== String(excludeProjectId) &&
        p.deleted == 0
    );

    if (projects.length > 0) {
        const projectsContainer = document.createElement('div');
        projectsContainer.classList.add('project-info', 'mt-1');

        const small = document.createElement('small');
        small.textContent = 'Also in: ';
        projects.forEach(p => {
            const badge = document.createElement('span');
            badge.className = 'badge badge-info mr-1';
            badge.textContent = p.title;
            small.appendChild(badge);
        });

        projectsContainer.appendChild(small);
        listItem.appendChild(projectsContainer);
    }
}

function populateWorksList(works) {
    const worksList = document.getElementById('worksList');

    if (!works || works.length === 0) {
        worksList.innerHTML = `
            <div class="alert alert-info m-3">
                <i class="fas fa-info-circle"></i> No works found.
            </div>
        `;
        updateSelectAllCheckbox();
        return;
    }

    worksList.innerHTML = '';

    works.forEach(work => {
        const listItem = createListItem(work);
        appendProjectInfo(work.id, listItem, editingProjectId);
        worksList.appendChild(listItem);
    });

    updateSelectAllCheckbox();
}

function createListItem(work) {
    const listItem = document.createElement('li');
    listItem.className = 'work-item';

    const workItemContent = document.createElement('div');
    workItemContent.className = 'work-item-content';

    // Checkbox, ticked from the page's own selection (not the saved state),
    // so searching never loses unsaved ticks
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'work-item-checkbox';
    checkbox.setAttribute('data-work-id', work.id);
    checkbox.checked = selectedWorkIds.has(String(work.id));

    // Thumbnail
    const thumbnail = document.createElement('img');
    thumbnail.className = 'work-item-thumbnail';
    thumbnail.src = '../thumbnails/' + work.location;
    thumbnail.alt = work.name;
    thumbnail.onerror = function() {
        this.onerror = null;
        this.style.visibility = 'hidden';
    };

    // Work name, with a note when it isn't a normal Select Work
    const nameSpan = document.createElement('span');
    nameSpan.className = 'work-item-name';
    nameSpan.textContent = work.name;
    if (work.visible == 0 || work.isSelectWork != 1) {
        const note = document.createElement('small');
        note.className = 'text-muted ml-2';
        note.textContent = work.visible == 0 ? '(deleted, hidden from visitors)' : '(not in Select Works)';
        nameSpan.appendChild(note);
    }

    workItemContent.appendChild(checkbox);
    workItemContent.appendChild(thumbnail);
    workItemContent.appendChild(nameSpan);
    listItem.appendChild(workItemContent);

    // Clicking anywhere on the row toggles the work
    listItem.addEventListener('click', function(event) {
        if (event.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
        }
        setWorkSelected(work.id, checkbox.checked);
    });

    return listItem;
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('myToastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Create toast content based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';

    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${icon} mr-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="close ml-2" data-dismiss="toast" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    // Add close button event
    const closeBtn = toast.querySelector('.close');
    closeBtn.addEventListener('click', function() {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    });

    // Append to container
    toastContainer.appendChild(toast);

    // Trigger animation in next tick
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

function validateForm(formId) {
    const form = document.getElementById(formId);

    // Check required fields
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('is-invalid');

            // Add error message if not already present
            if (!field.nextElementSibling || !field.nextElementSibling.classList.contains('invalid-feedback')) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'invalid-feedback';
                errorMsg.textContent = 'This field is required';
                field.parentNode.insertBefore(errorMsg, field.nextSibling);
            }
        } else {
            field.classList.remove('is-invalid');
        }
    });

    if (!isValid) {
        showToast('Please fill in all required fields', 'error');
    }

    return isValid;
}

function updateAllProjectCounts() {
    $.ajax({
        url: "../actions/projectsAPI.php",
        type: "GET",
        data: {activity: 'all'},  // New parameter to get all projects
        dataType: "json",
        success: function (data) {
            // Update counts based on all projects
            projectCounts.active = data.filter(p => p.active == 1 && p.deleted == 0).length;
            projectCounts.inactive = data.filter(p => p.active == 0 && p.deleted == 0).length;
            projectCounts.deleted = data.filter(p => p.deleted == 1).length;

            // Update the UI
            $('#activeCount').text(projectCounts.active);
            $('#inactiveCount').text(projectCounts.inactive);
            $('#deletedCount').text(projectCounts.deleted);
        },
        error: function (xhr, status, error) {
            console.log("Error fetching project counts: " + error);
        }
    });
}

function setWorkSelected(workId, isSelected) {
    if (isSelected) {
        selectedWorkIds.add(String(workId));
    } else {
        selectedWorkIds.delete(String(workId));
    }
    updateSelectAllCheckbox();
}

function getWorksToSave(projectId) {
    if (worksLoadedFor !== projectId) {
        return null;
    }
    return Array.from(selectedWorkIds).sort();
}

function worksHaveChanged(workIds) {
    return JSON.stringify(savedWorkIds.slice().sort()) !== JSON.stringify(workIds);
}