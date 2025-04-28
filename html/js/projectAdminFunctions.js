var pageNumber = 'active';
var allProjects = [];
var projectCounts = {
    active: 0,
    inactive: 0,
    deleted: 0
};
var allWorks = [];
var filteredWorks = [];

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

    // Select all works checkbox
    $('#selectAllWorks').on('change', function() {
        const isChecked = $(this).prop('checked');
        $('#worksList input[type="checkbox"]').prop('checked', isChecked);
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
    yearData = {activity: activity};

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
        data: yearData,
        dataType: "json",
        success: function (data) {
            allProjects = data.map(project => ({
                ...project,
                works: []  // Initialize an empty array to hold work IDs
            }));

            // First insert the data
            insertData(data);

            // Then fetch works and update counts
            const fetchPromises = [];
            allProjects.forEach(project => {
                const promise = fetchWorkIdsForProject(project.id).then(workIds => {
                    project.works = workIds;  // Store work IDs in the project object
                    // Update the work count badge immediately
                    updateWorksCountBadge(project.id, workIds.length);
                });
                fetchPromises.push(promise);
            });

            // After all fetches complete, refresh counts
            Promise.all(fetchPromises).then(() => {
                console.log("All work counts updated");
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

        // Description is not needed in the card view

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
    $('#selectAllWorks').prop('checked', false);

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

    // Load works for this project
    function fetchWorkIdsForProject(id) {
        return $.ajax({
            url: '../actions/worksOfProjectsAPI.php',
            type: 'GET',
            data: {'projectId': id},
            dataType: 'json'
        }).then(response => {
            console.log(`Project ${id} has ${response.length} works`); // Add logging
            return response; // This should be an array of work IDs
        });
    }

    // Show the modal
    $('#projectUpdateModal').modal('show');

    // Default to the details tab
    $('#projectTabs a[href="#details"]').tab('show');
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
    updateAllProjectCounts();
}

function updateWork() {
    // Validate only required fields (title is required, description is NOT)
    let isValid = true;

    // Check title field
    if (!$('#editProjectTitle').val().trim()) {
        $('#editProjectTitle').addClass('is-invalid');
        isValid = false;
    } else {
        $('#editProjectTitle').removeClass('is-invalid');
    }

    if (!isValid) {
        showToast('Please fill in the project title', 'error');
        return;
    }

    // Get form values
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
    };

    // Disable buttons
    const $saveButton = $('#projectUpdateModal .modal-footer .btn-primary');
    $saveButton.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Saving...
    `);

    $.ajax({
        url: '../actions/projectsAPI.php',
        type: 'PATCH',
        data: formData,
        success: function (response) {
            showToast('Project successfully updated!', 'success');
            getProjects(pageNumber);
            addWorksToProject();
            $('#projectUpdateModal').modal('hide');
        },
        error: function (xhr, status, error) {
            showToast('Error updating project: ' + error, 'error');
            console.error('Error:', error);
        },
        complete: function() {
            // Re-enable the button
            $saveButton.prop('disabled', false).html(`
                <i class="fas fa-save"></i> Save Changes
            `);
        }
    });
    updateAllProjectCounts();
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
    updateAllProjectCounts();
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
    updateAllProjectCounts();
}

function getThenPopulateWorks() {
    const projectId = $('#projectId').val();

    $.ajax({
        url: "../actions/picturesAPI.php",
        type: "GET",
        data: {'theYear': 'projectsAPI'},
        dataType: "json",
        success: function (data) {
            // Store all works globally for filtering
            allWorks = data;
            filteredWorks = [...allWorks];

            populateWorksList(data);
            checkWorkCheckboxes(projectId);
        },
        error: function (xhr, status, error) {
            console.log("An error occurred when loading works: " + error);
            showToast('Failed to load works. Please try again.', 'error');

            $('#worksList').html(`
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i> Failed to load works.
                    <button class="btn btn-outline-danger mt-3" onclick="getThenPopulateWorks()">
                        <i class="fas fa-sync"></i> Try Again
                    </button>
                </div>
            `);
        },
    });
}

function filterWorks(searchTerm) {
    if (!allWorks || allWorks.length === 0) return;

    if (!searchTerm) {
        // If search is empty, show all works
        filteredWorks = [...allWorks];
    } else {
        // Filter works based on search term
        filteredWorks = allWorks.filter(work =>
            work.name.toLowerCase().includes(searchTerm) ||
            (work.description && work.description.toLowerCase().includes(searchTerm))
        );
    }

    // Update the works list
    populateWorksList(filteredWorks);

    // Reapply checkboxes for the current project
    checkWorkCheckboxes($('#projectId').val());
}

function addWorksToProject() {
    const selectedWorks = document.querySelectorAll('#worksList input[type="checkbox"]:checked');
    const workIds = Array.from(selectedWorks).map(selectedWork => selectedWork.getAttribute('data-work-id')).sort();
    const projectId = document.getElementById('projectId').value;

    // Fetch existing work IDs for this project from allProjects array
    const currentProject = allProjects.find(project => project.id === projectId);
    if (!currentProject) {
        console.error('Current project not found');
        showToast('Project not found. Please try again.', 'error');
        return;
    }

    // Compare existing work IDs with newly selected work IDs
    const existingWorkIds = currentProject.works.sort();

    // If no changes, don't update
    if (JSON.stringify(existingWorkIds) === JSON.stringify(workIds)) {
        showToast('No changes in associated works.', 'info');
        return;
    }

    // Show loading state
    const $saveButton = $('#works .btn-primary');
    $saveButton.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Saving...
    `);

    // Continue with database update
    postWorksProjectsDB(projectId, workIds, $saveButton);
}

function postWorksProjectsDB(projectId, workIds, $button) {
    $.ajax({
        url: "../actions/worksOfProjectsAPI.php",
        type: "POST",
        data: {'projectId': projectId, 'workIds': workIds},
        dataType: "json",
        success: function (data) {
            showToast('Works successfully associated with project!', 'success');

            // Update the project in allProjects
            const projectIndex = allProjects.findIndex(p => p.id === projectId);
            if (projectIndex !== -1) {
                allProjects[projectIndex].works = workIds;
            }

            // Update works count in UI
            updateWorksCountBadge(projectId, workIds.length);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log("An error occurred: " + textStatus + ", " + errorThrown);
            showToast('Failed to update associated works.', 'error');
        },
        complete: function() {
            // Re-enable the button
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

function checkWorkCheckboxes(currentProjectId) {
    // Find the current project
    const currentProject = allProjects.find(project => project.id === currentProjectId);
    if (!currentProject) return;

    // Get work IDs for this project
    const workIds = currentProject.works || [];

    // First uncheck all checkboxes
    $('#worksList input[type="checkbox"]').prop('checked', false);

    // Remove any existing project info
    $('.project-info').remove();

    // Check checkboxes for works in this project
    $('#worksList input[type="checkbox"]').each(function() {
        const workId = $(this).attr('data-work-id');
        const listItem = $(this).closest('li');

        if (workIds.includes(workId)) {
            $(this).prop('checked', true);
        }

        // Add project info labels
        appendProjectInfo(workId, listItem[0], currentProjectId);
    });

    // Update "Select All" checkbox state
    updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
    const totalCheckboxes = $('#worksList input[type="checkbox"]').length;
    const checkedCheckboxes = $('#worksList input[type="checkbox"]:checked').length;

    if (totalCheckboxes === 0) {
        $('#selectAllWorks').prop('checked', false);
    } else if (checkedCheckboxes === 0) {
        $('#selectAllWorks').prop('checked', false);
        $('#selectAllWorks').prop('indeterminate', false);
    } else if (checkedCheckboxes === totalCheckboxes) {
        $('#selectAllWorks').prop('checked', true);
        $('#selectAllWorks').prop('indeterminate', false);
    } else {
        $('#selectAllWorks').prop('checked', false);
        $('#selectAllWorks').prop('indeterminate', true);
    }
}

function appendProjectInfo(workId, listItem, excludeProjectId = null) {
    // Find projects that contain this work, excluding the current project
    const projects = allProjects.filter(p =>
        p.works && p.works.includes(workId) &&
        p.id !== excludeProjectId &&
        p.deleted == 0
    );

    if (projects.length > 0) {
        const projectsContainer = document.createElement('div');
        projectsContainer.classList.add('project-info', 'mt-1');

        const projectNames = projects.map(p => {
            // Create a badge for each project
            return `<span class="badge badge-info mr-1">${p.title}</span>`;
        }).join('');

        projectsContainer.innerHTML = `<small>Also in: ${projectNames}</small>`;
        listItem.appendChild(projectsContainer);
    }
}

function populateWorksList(works) {
    const worksList = document.getElementById('worksList');

    if (!works || works.length === 0) {
        worksList.innerHTML = `
            <div class="alert alert-info m-3">
                <i class="fas fa-info-circle"></i> No works available.
            </div>
        `;
        return;
    }

    worksList.innerHTML = '';

    works.forEach(work => {
        const listItem = createListItem(work);
        worksList.appendChild(listItem);
    });

    // After populating the list, check works for current project
    if ($('#projectId').val()) {
        checkWorkCheckboxes($('#projectId').val());
    }
}

function createListItem(work) {
    const listItem = document.createElement('li');
    listItem.className = 'work-item';

    const workItemContent = document.createElement('div');
    workItemContent.className = 'work-item-content';

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'work-item-checkbox';
    checkbox.setAttribute('data-work-id', work.id);

    // Thumbnail
    const thumbnail = document.createElement('img');
    thumbnail.className = 'work-item-thumbnail';
    thumbnail.src = '../thumbnails/' + work.location;
    thumbnail.alt = work.name;
    thumbnail.onerror = function() {
        this.src = 'https://via.placeholder.com/40?text=No+Image';
    };

    // Work name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'work-item-name';
    nameSpan.textContent = work.name;

    // Add elements to the content container
    workItemContent.appendChild(checkbox);
    workItemContent.appendChild(thumbnail);
    workItemContent.appendChild(nameSpan);

    // Add content to list item
    listItem.appendChild(workItemContent);

    // Add click event to the list item (except checkbox)
    listItem.addEventListener('click', function(event) {
        if (event.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            // Update "Select All" checkbox state
            updateSelectAllCheckbox();
        }
    });

    // Add change event to the checkbox
    checkbox.addEventListener('change', function() {
        updateSelectAllCheckbox();
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