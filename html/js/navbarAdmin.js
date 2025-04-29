// Global variables
let listOfLinks = [];
let listOfLinksToDelete = [];
let draggedItem = null;
let deleteItemId = null;

// Initialize the page when the document is ready
$(document).ready(function () {
    // Load navigation links
    loadAndInsertLinks();

    // Initialize event listeners
    initializeEventListeners();

    // Setup search functionality
    setupSearch();
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Preview toggle
    $('#previewToggle').on('change', function() {
        $('#navbarPreview').toggle(this.checked);
    });

    // Setup drag and drop - using the working method from old code
    setupDragDrop();

    // Delete confirmation modal
    $('#confirmDeleteBtn').on('click', function() {
        if (deleteItemId) {
            deleteLink(deleteItemId);
            deleteItemId = null;
            $('#deleteConfirmModal').modal('hide');
        }
    });
}

/**
 * Set up the search functionality
 */
function setupSearch() {
    $('#searchLinks').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();

        $('.nav-item-card').each(function() {
            const displayText = $(this).find('.displayed-text').val().toLowerCase();
            const linkUrl = $(this).find('.link-redirection').val().toLowerCase();

            const isMatch = displayText.includes(searchTerm) || linkUrl.includes(searchTerm);
            $(this).toggle(isMatch);
        });
    });
}

/**
 * Setup drag and drop functionality
 */
function setupDragDrop() {
    const list = document.getElementById('navbarLinks');

    // Drag start
    list.addEventListener('dragstart', function(e) {
        draggedItem = e.target.closest('li');

        // Add visual feedback
        draggedItem.classList.add('dragging');
        draggedItem.style.opacity = '0.5';

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', draggedItem.outerHTML);
    });

    // Drag over
    list.addEventListener('dragover', function(e) {
        e.preventDefault();
        const target = e.target.closest('li');

        if (target && target !== draggedItem) {
            const bounding = target.getBoundingClientRect();
            const offset = bounding.y + bounding.height / 2;

            if (e.clientY - offset > 0) {
                target.after(draggedItem);
            } else {
                target.before(draggedItem);
            }
        }
    });

    // Drag end
    list.addEventListener('dragend', function(e) {
        // Remove visual effects
        draggedItem.classList.remove('dragging');
        draggedItem.style.opacity = '';

        updateNavbarOrder();
    });

    // These additional event listeners help with cross-browser compatibility
    list.addEventListener('dragenter', function(e) {
        e.preventDefault();
    });

    list.addEventListener('dragleave', function(e) {
        // Optional handling for drag leave
    });

    list.addEventListener('drop', function(e) {
        e.preventDefault();
    });
}

/**
 * Load and insert navigation links from the server
 */
function loadAndInsertLinks() {
    // Don't show loading toast - it's unnecessary for quick operations

    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.status === 'success') {
                insertLinks(response.data);
                updatePreview();
                // Don't show success toast on initial load
            } else {
                // Keep error toast - important for users to know
                showToast('Error fetching navigation links', 'error');
            }
        },
        error: function() {
            // Keep error toast - important for users to know
            showToast('An error occurred while fetching links', 'error');
        }
    });
}

/**
 * Insert navigation links into the list
 * @param {Array} links - Array of link objects
 */
function insertLinks(links) {
    $('#navbarLinks').empty();
    listOfLinks = links;
    links.forEach(function(link) {
        createNewNavLinkRow(
            link.ID,
            link.displayedText,
            link.linkRedirection,
            link.isChangeable,
            link.isNewTab,
            link.onclick,
            link.attachedFollowingDiv
        );
    });
}

/**
 * Create a new navigation link row
 * @param {string|number} id - Link ID
 * @param {string} displayedText - Link text
 * @param {string} linkRedirection - Link URL
 * @param {number} isChangeable - Whether the link is changeable (0 or 1)
 * @param {number} isNewTab - Whether the link opens in a new tab (0 or 1)
 * @param {string} onclick - Custom onclick event handler
 * @param {string} attachedFollowingDiv - JSON string for attached div
 */
function createNewNavLinkRow(id = Date.now(), displayedText = "New Link", linkRedirection = "", isChangeable = 1, isNewTab = 0, onclick = "", attachedFollowingDiv = "") {
    // Create list item with draggable attribute - make sure it's properly draggable
    const listItem = $('<li>').attr({
        id: `navLink_${id}`,
        class: 'nav-item-card mb-2 dragNavBar navLink', // Added dragNavBar and navLink classes from old code
        draggable: 'true'
    });

    // Create the main row
    const mainRow = $('<div>').addClass('row align-items-center');

    // Drag handle and lock icon column
    const handleCol = $('<div>').addClass('col-auto').css('width', '50px');
    const handleWrapper = $('<div>').addClass('d-flex align-items-center justify-content-start');

    // Drag handle icon
    const dragIcon = $('<i>').addClass('bi bi-grip-vertical me-2 drag-handle').css('cursor', 'grab');
    handleWrapper.append(dragIcon);

    // Lock icon if not changeable
    if (parseInt(isChangeable) === 0) {
        const lockIcon = $('<i>').addClass('bi bi-lock-fill text-warning');
        handleWrapper.append(lockIcon);
    }

    handleCol.append(handleWrapper);

    // Text input column
    const textCol = $('<div>').addClass('col-md-4');
    const textGroup = $('<div>').addClass('input-group input-group-sm');
    const textLabel = $('<span>').addClass('input-group-text').text('Text');
    const textInput = $('<input>').attr({
        type: 'text',
        id: `display_${id}`,
        class: 'form-control form-control-sm displayed-text',
        value: displayedText
    });
    textGroup.append(textLabel, textInput);
    textCol.append(textGroup);

    // URL input column
    const urlCol = $('<div>').addClass('col-md');
    const urlGroup = $('<div>').addClass('input-group input-group-sm');
    const urlLabel = $('<span>').addClass('input-group-text').text('URL');
    const urlInput = $('<input>').attr({
        type: 'text',
        id: `link_${id}`,
        class: 'form-control form-control-sm link-redirection',
        placeholder: parseInt(isChangeable) === 0 ? 'Only admin can change' : 'Link URL',
        value: parseInt(isChangeable) === 0 ? '' : linkRedirection,
        disabled: parseInt(isChangeable) === 0
    });
    urlGroup.append(urlLabel, urlInput);
    urlCol.append(urlGroup);

    // Delete button column
    const deleteCol = $('<div>').addClass('col-auto');
    const deleteBtn = $('<button>').attr({
        id: `deleteBtn_${id}`,
        class: 'btn btn-sm btn-outline-danger',
        disabled: parseInt(isChangeable) === 0
    }).html('<i class="bi bi-trash"></i>');

    // Set up delete confirmation
    deleteBtn.on('click', function() {
        const displayText = $(`#display_${id}`).val();
        $('#deleteItemName').text(displayText);
        deleteItemId = id;
        $('#deleteConfirmModal').modal('show');
    });

    deleteCol.append(deleteBtn);

    // Assemble the row
    mainRow.append(handleCol, textCol, urlCol, deleteCol);
    listItem.append(mainRow);

    // Add hidden fields for other data
    const hiddenFields = $('<div>').addClass('d-none');

    // New Tab checkbox
    const newTabInput = $('<input>').attr({
        type: 'checkbox',
        id: `newTab_${id}`,
        checked: parseInt(isNewTab) === 1
    });

    // OnClick field
    const onclickInput = $('<input>').attr({
        type: 'hidden',
        id: `onclick_${id}`,
        value: onclick || ''
    });

    // AttachedFollowingDiv data
    const attachedDivInput = $('<input>').attr({
        type: 'hidden',
        id: `attachedFollowingDiv_${id}`,
        value: attachedFollowingDiv || ''
    });

    hiddenFields.append(newTabInput, onclickInput, attachedDivInput);
    listItem.append(hiddenFields);

    // Add to the list
    $('#navbarLinks').append(listItem);
}

/**
 * Update the preview section
 */
function updatePreview() {
    const previewNav = $('#previewNavbar');
    if (!previewNav.length) return; // Skip if preview element doesn't exist

    previewNav.empty();

    $('.nav-item-card').each(function() {
        const id = this.id.replace('navLink_', '');
        const displayText = $(`#display_${id}`).val();
        const linkUrl = $(`#link_${id}`).val();
        const newTab = $(`#newTab_${id}`).is(':checked');
        const onClick = $(`#onclick_${id}`).val();
        const hasAttachedDiv = $(`#hasDivToggle_${id}`).is(':checked');

        // Create the main link
        const previewItem = $('<li>').addClass('nav-item');
        const previewLink = $('<a>').addClass('nav-link').attr({
            href: linkUrl || '#',
            target: newTab ? '_blank' : ''
        }).text(displayText);

        if (newTab) {
            previewLink.append(' <i class="bi bi-box-arrow-up-right" style="font-size: 0.75em;"></i>');
        }

        // Add onclick indicator if it exists
        if (onClick) {
            previewLink.append(' <i class="bi bi-code-slash text-info ms-1" title="Has onClick: ' + onClick + '"></i>');
        }

        previewItem.append(previewLink);

        // Add attached div indicator if enabled
        if (hasAttachedDiv) {
            const divId = $(`#divId_${id}`).val();
            const divClass = $(`#divClass_${id}`).val();

            previewItem.append(
                $('<div>').addClass('attached-div-preview mt-1 ps-3 border-start border-info')
                    .append(
                        $('<small>').addClass('text-muted').html(
                            `<i class="bi bi-braces"></i> Attached Div: <code>${divId}</code> <span class="text-info">[${divClass}]</span>`
                        )
                    )
            );
        }

        previewNav.append(previewItem);
    });
}

/**
 * Save an individual link using PATCH
 * @param {string|number} id - Link ID
 */
function saveIndividualLink(id) {
    // Show loading indicator for this specific button
    const saveBtn = $(`#saveBtn_${id}`);
    const originalContent = saveBtn.html();
    saveBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...').prop('disabled', true);

    // Gather the data for this link
    const displayedText = $(`#display_${id}`).val();
    const linkRedirection = $(`#link_${id}`).val();
    const onclick = $(`#onclick_${id}`).val();
    const isNewTab = $(`#newTab_${id}`).is(':checked') ? 1 : 0;

    // Handle attached div data
    let attachedFollowingDiv = null;
    if ($(`#hasDivToggle_${id}`).is(':checked')) {
        const divId = $(`#divId_${id}`).val();
        const divClass = $(`#divClass_${id}`).val();

        if (divId) {
            attachedFollowingDiv = JSON.stringify({
                id: divId,
                class: divClass
            });
        }
    }

    // Get the position (order)
    const position = $(`#navLink_${id}`).index() + 1;

    // Create the data object
    const data = {
        ID: id,
        displayedText: displayedText,
        linkRedirection: linkRedirection,
        displayedOrder: position,
        onclick: onclick,
        isNewTab: isNewTab
    };

    if (attachedFollowingDiv !== null) {
        data.attachedFollowingDiv = attachedFollowingDiv;
    }

    // Send the PATCH request
    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'PATCH',
        data: data,
        success: function(response) {
            // Restore the button
            saveBtn.html(originalContent).prop('disabled', false);

            if (response.status === 'success') {
                // Keep success toast - important feedback for save operation
                showToast(`Link "${displayedText}" saved successfully`, 'success');

                // Highlight the row briefly to indicate success
                $(`#navLink_${id}`).addClass('save-success');
                setTimeout(function() {
                    $(`#navLink_${id}`).removeClass('save-success');
                }, 2000);
            } else {
                // Keep error toast - important for users to know
                showToast('Error saving link: ' + response.message, 'error');
            }
        },
        error: function(xhr) {
            // Restore the button
            saveBtn.html(originalContent).prop('disabled', false);

            let errorMsg = 'An error occurred while saving';
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.message) {
                    errorMsg = response.message;
                }
            } catch (e) {
                // If parsing fails, use the status text
                errorMsg = xhr.statusText;
            }

            // Keep error toast - important for users to know
            showToast(`Error: ${errorMsg}`, 'error');
        }
    });
}

/**
 * Delete a navigation link
 * @param {string|number} uniqueId - Link ID
 */
function deleteLink(uniqueId) {
    let html_id = '#navLink_' + uniqueId;
    $(html_id).fadeOut(300, function() {
        $(this).remove();
        updatePreview();
    });

    listOfLinksToDelete.push(uniqueId);
    removeLinkFromArray(uniqueId);

    // Show a toast for successful deletion
    const displayText = $(`#display_${uniqueId}`).val() || 'Link';
    showToast(`"${displayText}" has been deleted`, 'success');
}

/**
 * Remove a link from the links array
 * @param {string|number} id - Link ID
 */
function removeLinkFromArray(id) {
    listOfLinks = listOfLinks.filter(link => link.ID !== id);
}

/**
 * Update the order of navigation items
 */
function updateNavbarOrder() {
    updatePreview();
    // Don't show a toast for order updates - it would be too frequent
}

/**
 * Collect link data from the form
 * @returns {Array} - Array of link objects
 */
function collectLinksData() {
    let links = [];
    $('.nav-item-card').each(function(index) {
        const id = this.id.replace('navLink_', '');
        const displayedText = $(`#display_${id}`).val();
        const linkRedirection = $(`#link_${id}`).val();
        const onclick = $(`#onclick_${id}`).val();
        const isNewTab = $(`#newTab_${id}`).is(':checked') ? 1 : 0;

        // Handle attached div data
        let attachedFollowingDiv = null;
        if ($(`#hasDivToggle_${id}`).is(':checked')) {
            const divId = $(`#divId_${id}`).val();
            const divClass = $(`#divClass_${id}`).val();

            if (divId) {
                attachedFollowingDiv = JSON.stringify({
                    id: divId,
                    class: divClass
                });
            }
        }

        const linkData = {
            id: id,
            displayedText: displayedText,
            linkRedirection: linkRedirection,
            onclick: onclick,
            isNewTab: isNewTab,
            order: index + 1
        };

        if (attachedFollowingDiv !== null) {
            linkData.attachedFollowingDiv = attachedFollowingDiv;
        }

        links.push(linkData);
    });

    return links;
}

/**
 * Save links to the server
 */
function saveLinks() {
    // Show loading spinner
    $('#saveSpinner').show();

    let linksToUpdateOrSave = collectLinksData();
    const totalLinks = linksToUpdateOrSave.length;
    const deletedCount = listOfLinksToDelete.length;

    const payload = {
        createOrUpdate: linksToUpdateOrSave,
        delete: listOfLinksToDelete
    };

    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function(response) {
            $('#saveSpinner').hide();

            // Show a more detailed success message
            let message = 'Links successfully updated';
            if (deletedCount > 0) {
                message += ` (${totalLinks} saved, ${deletedCount} deleted)`;
            }

            showToast(message, 'success');
            listOfLinksToDelete = []; // Reset delete list
            loadAndInsertLinks();
        },
        error: function() {
            $('#saveSpinner').hide();
            showToast('Error saving links', 'error');
        }
    });
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
    // Clear existing toasts of the same type to prevent stacking
    $('.toast-container .bg-' + (type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info')).remove();

    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    $('.toast-container').append(toastHTML);
    const toastElement = new bootstrap.Toast(document.getElementById(toastId), {
        delay: 3000 // Reduced from 5000 to 3000 for less intrusive experience
    });
    toastElement.show();
}