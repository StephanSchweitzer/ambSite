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
var savedWorkIds = [];          // that project's works as stored in the database, in order
var selectedWorkIds = new Set(); // what is ticked, kept apart from what is on screen
var workOrder = [];             // what is ticked, in the order the project shows it

// Whether each project can keep its own order of works yet: that needs
// database/projectWorkOrder.sql to have been run (manageProjects.php checks)
var workOrderReady = window.AMB_WORK_ORDER_READY === true;

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

    // Projects: drag a card to move it (on the Active list, not while searching)
    makeSortable(document.getElementById('existingPostInformation'), '.project-slot', 'data-project-id',
        function () { return canOrderProjects() && !$('#projectSearch').val(); },
        function (ids) { setProjectOrder(ids); });

    $('#existingPostInformation').on('click', '.js-move-project', function (e) {
        e.stopPropagation();
        moveProject($(this).closest('.project-slot').attr('data-project-id'), Number($(this).attr('data-step')));
    });

    // Works inside the open project
    makeSortable(document.getElementById('arrangeArea'), '.arrange-item', 'data-work-id',
        function () { return true; },
        function (ids) { workOrder = ids; drawArrangeList(); });

    // An arrow moves a work one place within its year group
    $('#arrangeArea').on('click', '.js-move-work', function () {
        const id = $(this).closest('.arrange-item').attr('data-work-id');
        const groups = arrangeGroups();
        const group = groups.find(g => g.ids.includes(id));
        if (!group) return;
        const from = group.ids.indexOf(id);
        const to = from + Number($(this).attr('data-step'));
        if (to < 0 || to >= group.ids.length) return;
        group.ids.splice(to, 0, group.ids.splice(from, 1)[0]);
        workOrder = [].concat(...groups.map(g => g.ids));
        drawArrangeList();
    });

    $('#arrange-tab').on('shown.bs.tab', drawArrangeList);

    // Forget the open project when the edit window closes, so a slow
    // response for it can't land in the next project's window
    $('#projectUpdateModal').on('hidden.bs.modal', function() {
        editingProjectId = null;
        worksLoadedFor = null;
    });

    // Set active button state
    $('#activeBtn, #inactiveBtn, #deletedBtn').on('click', function() {
        $('#activeBtn, #inactiveBtn, #deletedBtn').removeClass('active');
        $(this).addClass('active');
    });
});

function getProjects(activity) {
    // Show loading state
    $('#existingPostInformation').html(`
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading projects...</p>
        </div>
    `);

    pageNumber = activity;
    var activityData = {activity: activity};

    // Set active button
    $('#activeBtn, #inactiveBtn, #deletedBtn').removeClass('active');
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

    const canOrder = canOrderProjects() && items.length > 1;
    $('#projectOrderHint').toggle(canOrder);

    items.forEach(function (item, index) {
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

        // Its place on the Works page, with arrows to move it
        const orderControls = canOrder ? `
                        <div class="order-controls">
                            <i class="fas fa-grip-vertical drag-handle" title="Drag to move" aria-hidden="true"></i>
                            <span class="order-position">${index + 1} of ${items.length}</span>
                            <button type="button" class="btn-move js-move-project" data-step="-1" aria-label="Move earlier" title="Move earlier"${index === 0 ? ' disabled' : ''}>
                                <i class="fas fa-arrow-up d-md-none"></i><i class="fas fa-arrow-left d-none d-md-inline"></i>
                            </button>
                            <button type="button" class="btn-move js-move-project" data-step="1" aria-label="Move later" title="Move later"${index === items.length - 1 ? ' disabled' : ''}>
                                <i class="fas fa-arrow-down d-md-none"></i><i class="fas fa-arrow-right d-none d-md-inline"></i>
                            </button>
                        </div>` : '';

        // Create the card HTML
        const cardHtml = `
            <div class="col-md-4 mb-4 project-slot" data-project-id="${id}"${canOrder ? ' draggable="true"' : ''}>
                <div class="card project-card shadow-grow position-relative" data-id="${id}">
                    <div class="status-indicator ${statusClass}"></div>
                    <div class="card-body">
                        <h5 class="card-title" style="color: #ffffff;">${title} ${worksCountBadge}</h5>
                        <div class="mb-3">
                            ${statusBadge} ${currentBadge}
                        </div>
                        <p class="card-text"><strong>ID:</strong> ${id}</p>
                        <button class="btn btn-sm btn-outline-light mt-2 edit-project-btn">
                            <i class="fas fa-edit"></i> Edit Project
                        </button>
                        ${orderControls}
                    </div>
                </div>
            </div>
        `;

        // Append the card to the container
        $('#existingPostInformation').append(cardHtml);

        // Add click event to the card
        $(`[data-id="${id}"]`).click(function(e) {
            if (!$(e.target).hasClass('edit-project-btn') &&
                !$(e.target).parent().hasClass('edit-project-btn') &&
                !$(e.target).closest('.order-controls').length) {
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
    // Moving projects while some are hidden would be confusing
    $('#existingPostInformation').toggleClass('is-searching', !!searchTerm);

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
    workOrder = [];
    drawArrangeList();

    // Show loading state in works list
    $('#worksList').html(`
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading works...</span>
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

        // In the order the Works page shows them
        savedWorkIds = toIdList(associatedResponse[0]).filter((id, i, all) => all.indexOf(id) === i);
        selectedWorkIds = new Set(savedWorkIds);
        workOrder = savedWorkIds.slice();

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
        drawArrangeList();
    }, function(xhr, status, error) {
        if (editingProjectId !== projectId) return;
        console.error('Error fetching works:', error);
        $('#arrangeArea').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> Failed to load works. The order will not be changed when you save.
            </div>
        `);
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

// Saves the open project's works (which ones, and their order). Called by
// the "Save Associated Works" and "Save Order" buttons.
function addWorksToProject(button) {
    const $saveButton = $(button || '#works .btn-primary');
    const label = $saveButton.html();
    const projectId = String($('#projectId').val());
    const workIds = getWorksToSave(projectId);

    if (workIds === null) {
        showToast('The works list has not loaded yet, so nothing was saved.', 'error');
        return;
    }

    if (!worksHaveChanged(workIds)) {
        showToast('Nothing has changed since the last save.', 'info');
        return;
    }

    $saveButton.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Saving...
    `);

    return postWorksProjectsDB(projectId, workIds).then(function() {
        showToast('The project\'s works are saved!', 'success');
    }, function() {
        showToast('Failed to save the project\'s works. Nothing was changed.', 'error');
    }).always(function() {
        $saveButton.prop('disabled', false).html(label);
    });
}


function postWorksProjectsDB(projectId, workIds) {
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
            badge.className = 'badge bg-info me-1';
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
        note.className = 'text-muted ms-2';
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
            <i class="fas fa-${icon} me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
    `;

    // Add close button event
    const closeBtn = toast.querySelector('.btn-close');
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

// A newly ticked work goes at the end of the project's order
function setWorkSelected(workId, isSelected) {
    workId = String(workId);
    if (isSelected) {
        selectedWorkIds.add(workId);
        if (!workOrder.includes(workId)) workOrder.push(workId);
    } else {
        selectedWorkIds.delete(workId);
        workOrder = workOrder.filter(id => id !== workId);
    }
    updateSelectAllCheckbox();
}

// The works to save, in order, or null if the list hasn't loaded
function getWorksToSave(projectId) {
    if (worksLoadedFor !== projectId) {
        return null;
    }
    return workOrder.slice();
}

// Before the database can keep an order, only which works matters
function worksHaveChanged(workIds) {
    if (!workOrderReady) {
        return JSON.stringify(savedWorkIds.slice().sort()) !== JSON.stringify(workIds.slice().sort());
    }
    return JSON.stringify(savedWorkIds) !== JSON.stringify(workIds);
}

// ---------- Putting projects and works in order ----------

// Only the Active list is shown on the Works page, so only it is ordered
function canOrderProjects() {
    return pageNumber === 'active';
}

function moveProject(id, step) {
    const ids = allProjects.map(p => p.id);
    const from = ids.indexOf(String(id));
    const to = from + step;
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setProjectOrder(ids);
    // Keep the keyboard on the moved project's arrow
    $(`.project-slot[data-project-id="${id}"] .js-move-project[data-step="${step}"]:not(:disabled)`).trigger('focus');
}

// Redraws the projects in this order and saves it
function setProjectOrder(ids) {
    allProjects.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    insertData(allProjects);
    filterProjects(($('#projectSearch').val() || '').toLowerCase());

    const postData = new FormData();
    postData.append('action', 'order');
    postData.append('ids', JSON.stringify(ids));

    // A quiet note beside the hint rather than a toast for every move
    const $status = $('#projectOrderStatus').text('Saving...');

    $.ajax({
        url: '../actions/projectsAPI.php',
        type: 'POST',
        data: postData,
        processData: false,
        contentType: false,
        dataType: 'json',
        success: function () {
            $status.html('<i class="fas fa-check text-success"></i> Saved.');
        },
        error: function () {
            $status.text('');
            showToast('The new order could not be saved. Showing the order as it was.', 'error');
            getProjects(pageNumber);
        }
    });
}

// The "Order of Works" tab: the ticked works as tiles, in order
function drawArrangeList() {
    const $area = $('#arrangeArea');

    if (!workOrderReady) {
        $area.html(`
            <div class="alert alert-info mb-0">
                <i class="fas fa-info-circle"></i>
                Putting the works of a project in order needs a one-time update to the website first, which Stephan does.
                Until then, works appear in the order set on each painting.
            </div>
        `);
        return;
    }

    if (worksLoadedFor === null || worksLoadedFor !== editingProjectId) {
        $area.html(`
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading works...</span>
                </div>
            </div>
        `);
        return;
    }

    if (workOrder.length === 0) {
        $area.html(`
            <div class="alert alert-info mb-0">
                <i class="fas fa-info-circle"></i> This project has no works yet. Tick some in Associated Works.
            </div>
        `);
        return;
    }

    // Keep the keyboard where it was across the redraw
    const active = document.activeElement;
    const focused = active && active.closest ? active.closest('.arrange-item') : null;
    const focusedId = focused ? focused.getAttribute('data-work-id') : null;
    const focusedStep = focused ? active.getAttribute('data-step') : null;

    const byId = new Map(allWorks.map(work => [work.id, work]));
    const groups = arrangeGroups();
    const grouped = groups.length > 1;

    // One list per year group, as the Works page shows them; a work only
    // moves inside its own group
    const sections = groups.map(group => {
        const $section = $('<div class="arrange-group">');
        if (grouped) {
            $section.append($('<h6 class="arrange-group-title">').text(group.label || 'Without a year'));
        }
        const list = document.createElement('ul');
        list.className = 'arrange-list';
        group.ids.forEach((id, index) => list.appendChild(arrangeItem(byId.get(id), id, index, group.ids.length)));
        return $section.append(list);
    });

    $area.empty().append(
        $('<p class="order-hint">').html('<i class="fas fa-grip-vertical me-1"></i> Drag the works, or use the arrows, into the order you want them on your Works page. Works you tick later go at the end.' +
            (grouped ? ' Your Works page shows this project in groups of years, so each work moves within its own group.' : '')),
        sections,
        $('<div class="text-end">').append(
            $('<button type="button" class="btn btn-primary">').html('<i class="fas fa-save"></i> Save Order')
                .on('click', function () { addWorksToProject(this); })
        )
    );

    if (focusedId && focusedStep) {
        $(`.arrange-item[data-work-id="${focusedId}"] .js-move-work[data-step="${focusedStep}"]:not(:disabled)`).trigger('focus');
    }
}

// One work's tile: its picture, name, and arrows to move it within its group
function arrangeItem(work, id, index, count) {
    work = work || { name: 'Work ' + id, location: '' };
    const item = document.createElement('li');
    item.className = 'arrange-item';
    item.draggable = true;
    item.setAttribute('data-work-id', id);

    const img = document.createElement('img');
    img.src = '../thumbnails/' + work.location;
    img.alt = '';
    img.draggable = false;
    img.onerror = function () {
        this.onerror = null;
        this.style.visibility = 'hidden';
    };

    const name = document.createElement('div');
    name.className = 'arrange-name';
    name.textContent = work.name;
    name.title = work.name;

    const moves = document.createElement('div');
    moves.className = 'arrange-moves';
    moves.innerHTML = `
        <button type="button" class="btn-move js-move-work" data-step="-1" aria-label="Move earlier" title="Move earlier"${index === 0 ? ' disabled' : ''}>
            <i class="fas fa-arrow-left"></i>
        </button>
        <span class="order-position">${index + 1}</span>
        <button type="button" class="btn-move js-move-work" data-step="1" aria-label="Move later" title="Move later"${index === count - 1 ? ' disabled' : ''}>
            <i class="fas fa-arrow-right"></i>
        </button>
    `;

    item.append(img, name, moves);
    return item;
}

// The open project's ticked works (ids) as its Works page groups them: by
// year bands, newest first, for the projects the page groups that way, with
// works without a year last. Any other project, or one whose works all fall
// in one group, is a single group. The bands and the project names come from
// publicPageFunctions.php (window.AMB_YEAR_GROUPS); how works are sorted into
// them mirrors ambWorkGroups() there and workGroups() in photoFunctions.js.
function arrangeGroups() {
    const config = window.AMB_YEAR_GROUPS || { bands: [], projects: [] };
    const project = allProjects.find(p => p.id === editingProjectId);
    const title = project ? String(project.title).replace(/\s+/g, '').toLowerCase() : '';
    const single = [{ label: '', ids: workOrder.slice() }];
    if (!config.projects.includes(title)) {
        return single;
    }

    const byId = new Map(allWorks.map(work => [work.id, work]));
    const groups = [];
    const byLabel = {};
    workOrder.forEach(id => {
        const work = byId.get(id);
        const found = String(work && work.creationYear != null ? work.creationYear : '').match(/\d{4}/);
        let year = found ? Number(found[0]) : null;
        if (year !== null && (year < 1900 || year > 2100)) year = null;

        let label = '';
        let from = -1; // works without a year go last
        if (year !== null) {
            label = String(year);
            from = year;
            const band = config.bands.find(b => year >= b[0] && year <= b[1]);
            if (band) {
                label = band[0] === band[1] ? String(band[0]) : band[0] + '–' + band[1];
                from = band[0];
            }
        }
        if (!byLabel.hasOwnProperty(label)) {
            byLabel[label] = { label: label, from: from, ids: [] };
            groups.push(byLabel[label]);
        }
        byLabel[label].ids.push(id);
    });

    return groups.length < 2 ? single : groups.sort((a, b) => b.from - a.from);
}

// Lets the items of a list be dragged into a new order. canDrag() says
// whether dragging is allowed right now; onDrop(ids) runs after a drag that
// changed the order, with the items' ids in their new order.
function makeSortable(container, itemSelector, idAttribute, canDrag, onDrop) {
    let dragged = null;
    let orderBefore = '';

    const currentIds = () => Array.from(container.querySelectorAll(itemSelector))
        .map(el => el.getAttribute(idAttribute));

    container.addEventListener('dragstart', function (e) {
        const item = e.target.closest ? e.target.closest(itemSelector) : null;
        if (!item || !canDrag()) {
            e.preventDefault();
            return;
        }
        dragged = item;
        orderBefore = currentIds().join(',');
        item.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.getAttribute(idAttribute));
    });

    container.addEventListener('dragover', function (e) {
        if (!dragged) return;
        e.preventDefault();
        // Only among its own list (a year group, for works)
        const target = e.target.closest ? e.target.closest(itemSelector) : null;
        if (!target || target === dragged || target.parentElement !== dragged.parentElement) return;

        // Items side by side: the left or right half of the one under the
        // pointer; items one per row (a phone): its top or bottom half
        const box = target.getBoundingClientRect();
        const oneColumn = box.width > container.clientWidth * 0.6;
        const after = oneColumn
            ? e.clientY > box.top + box.height / 2
            : e.clientX > box.left + box.width / 2;
        if (after) {
            target.after(dragged);
        } else {
            target.before(dragged);
        }
    });

    container.addEventListener('drop', function (e) {
        if (dragged) e.preventDefault();
    });

    container.addEventListener('dragend', function () {
        if (!dragged) return;
        dragged.classList.remove('is-dragging');
        dragged = null;
        const ids = currentIds();
        if (ids.join(',') !== orderBefore) {
            onDrop(ids);
        }
    });
}