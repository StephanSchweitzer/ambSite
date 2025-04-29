let allSubscribers = [];
let filteredSubscribers = [];
let currentPage = 1;
const itemsPerPage = 10;

$(document).ready(function() {
    // Load subscribers when page loads
    loadSubscribers();

    // Search functionality
    $('#searchInput').on('keyup', function() {
        applyFilters();
    });

    // Status filter
    $('#statusFilter').on('change', function() {
        applyFilters();
    });

    // Edit button handlers
    $('#saveEdit').on('click', function() {
        saveEditedSubscriber();
    });

    // Delete button handlers
    $('#confirmDelete').on('click', function() {
        deleteSubscriber();
    });

    // Export to CSV
    $('#exportCSV').on('click', function() {
        exportToCSV();
    });

    // Export Email List for copy/paste
    $('#exportEmailList').on('click', function() {
        exportEmailList();
    });

    // Copy to clipboard
    $('#copyToClipboard').on('click', function() {
        copyEmailListToClipboard();
    });

    // Download email list as text file
    $('#downloadEmailList').on('click', function() {
        downloadEmailListAsText();
    });
});

// Load all subscribers from the API
function loadSubscribers() {
    $.ajax({
        url: '../actions/newsletterAPI.php',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            if (response.status === 'success') {
                allSubscribers = response.data;
                filteredSubscribers = [...allSubscribers];
                updateStats();
                displaySubscribers();
                showToast('Subscribers loaded successfully', 'success');
            } else {
                showToast('Error loading subscribers: ' + response.message, 'error');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error:', error);
            showToast('Failed to load subscribers', 'error');
        }
    });
}

// Update dashboard statistics
function updateStats() {
    const total = allSubscribers.length;
    const active = allSubscribers.filter(sub => sub.active == 1).length;
    const inactive = total - active;

    $('#totalSubscribers').text(total);
    $('#activeSubscribers').text(active);
    $('#inactiveSubscribers').text(inactive);
}

// Apply search and status filters
function applyFilters() {
    const searchTerm = $('#searchInput').val().toLowerCase();
    const statusFilter = $('#statusFilter').val();

    filteredSubscribers = allSubscribers.filter(sub => {
        // Apply search filter
        const matchesSearch = sub.email.toLowerCase().includes(searchTerm);

        // Apply status filter
        let matchesStatus = true;
        if (statusFilter === 'active') {
            matchesStatus = sub.active == 1;
        } else if (statusFilter === 'inactive') {
            matchesStatus = sub.active == 0;
        }

        return matchesSearch && matchesStatus;
    });

    // Reset to first page when filtering
    currentPage = 1;
    displaySubscribers();
}

// Display subscribers with pagination
function displaySubscribers() {
    const subscribers = filteredSubscribers;
    const totalPages = Math.ceil(subscribers.length / itemsPerPage);

    // Adjust current page if needed
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }

    // Calculate range for current page
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, subscribers.length);
    const pageSubscribers = subscribers.slice(start, end);

    // Clear the table
    const tbody = $('#subscribersList');
    tbody.empty();

    // Display no results message if needed
    if (pageSubscribers.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="5" class="text-center">No subscribers found</td>
            </tr>
        `);
    } else {
        // Add each subscriber to the table
        pageSubscribers.forEach((subscriber, index) => {
            const rowNumber = start + index + 1;
            const date = new Date(subscriber.subscriptionDate);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const statusBadge = subscriber.active == 1
                ? '<span class="badge badge-success">Active</span>'
                : '<span class="badge badge-secondary">Inactive</span>';

            tbody.append(`
                <tr>
                    <td>${rowNumber}</td>
                    <td>${subscriber.email}</td>
                    <td>${formattedDate}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary mr-2" onclick="openEditModal(${subscriber.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="openDeleteModal(${subscriber.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    // Update pagination
    updatePagination(totalPages);
}

// Update pagination controls
function updatePagination(totalPages) {
    const pagination = $('#pagination');
    pagination.empty();

    // Don't show pagination if no pages or only one page
    if (totalPages <= 1) {
        return;
    }

    // Previous button
    pagination.append(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" onclick="changePage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `);

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
        pagination.append(`
            <li class="page-item">
                <a class="page-link" href="javascript:void(0)" onclick="changePage(1)">1</a>
            </li>
        `);

        if (startPage > 2) {
            pagination.append(`
                <li class="page-item disabled">
                    <a class="page-link" href="javascript:void(0)">...</a>
                </li>
            `);
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        pagination.append(`
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="changePage(${i})">${i}</a>
            </li>
        `);
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination.append(`
                <li class="page-item disabled">
                    <a class="page-link" href="javascript:void(0)">...</a>
                </li>
            `);
        }

        pagination.append(`
            <li class="page-item">
                <a class="page-link" href="javascript:void(0)" onclick="changePage(${totalPages})">${totalPages}</a>
            </li>
        `);
    }

    // Next button
    pagination.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" onclick="changePage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `);
}

// Change current page
function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredSubscribers.length / itemsPerPage)) {
        return; // Invalid page
    }

    currentPage = page;
    displaySubscribers();
}

// Open the edit modal for a subscriber
function openEditModal(id) {
    const subscriber = allSubscribers.find(sub => sub.id == id);
    if (!subscriber) {
        showToast('Subscriber not found', 'error');
        return;
    }

    // Populate the form
    $('#editId').val(subscriber.id);
    $('#editEmail').val(subscriber.email);
    $('#editActive').prop('checked', subscriber.active == 1);

    // Show the modal
    $('#editModal').modal('show');
}

// Save changes to a subscriber
function saveEditedSubscriber() {
    const id = $('#editId').val();
    const email = $('#editEmail').val();
    const active = $('#editActive').is(':checked');

    // Validate email
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Send update request
    $.ajax({
        url: '../actions/newsletterAPI.php',
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            id: id,
            email: email,
            active: active
        }),
        success: function(response) {
            if (response.status === 'success') {
                $('#editModal').modal('hide');
                loadSubscribers(); // Refresh the data
                showToast('Subscriber updated successfully', 'success');
            } else {
                showToast('Error: ' + response.message, 'error');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error:', error);
            showToast('Failed to update subscriber', 'error');
        }
    });
}

// Open the delete modal for a subscriber
function openDeleteModal(id) {
    const subscriber = allSubscribers.find(sub => sub.id == id);
    if (!subscriber) {
        showToast('Subscriber not found', 'error');
        return;
    }

    // Populate the modal
    $('#deleteId').val(subscriber.id);
    $('#deleteEmailText').text(subscriber.email);

    // Show the modal
    $('#deleteModal').modal('show');
}

// Delete a subscriber
function deleteSubscriber() {
    const id = $('#deleteId').val();

    // Send delete request
    $.ajax({
        url: '../actions/newsletterAPI.php',
        type: 'DELETE',
        contentType: 'application/json',
        data: JSON.stringify({
            id: id
        }),
        success: function(response) {
            if (response.status === 'success') {
                $('#deleteModal').modal('hide');
                loadSubscribers(); // Refresh the data
                showToast('Subscriber deleted successfully', 'success');
            } else {
                showToast('Error: ' + response.message, 'error');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error:', error);
            showToast('Failed to delete subscriber', 'error');
        }
    });
}

// Export current view to CSV
function exportToCSV() {
    // Prepare the CSV header
    let csv = 'ID,Email,Subscription Date,Status\n';

    // Add each subscriber to the CSV
    filteredSubscribers.forEach(sub => {
        const status = sub.active == 1 ? 'Active' : 'Inactive';
        csv += `${sub.id},"${sub.email}","${sub.subscriptionDate}",${status}\n`;
    });

    // Create a download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'newsletter_subscribers.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('CSV export complete', 'success');
}

// Export email list for copy/paste
function exportEmailList() {
    // Get all active emails
    const activeOnly = $('#statusFilter').val() === 'active';
    const emails = filteredSubscribers
        .filter(sub => !activeOnly || sub.active == 1)
        .map(sub => sub.email)
        .join(', ');

    // Set the email list in the textarea
    $('#emailListText').val(emails);

    // Show the modal
    $('#emailListModal').modal('show');
}

// Copy email list to clipboard
function copyEmailListToClipboard() {
    const emailListText = $('#emailListText').val();

    // Use the modern Clipboard API if available
    if (navigator.clipboard) {
        navigator.clipboard.writeText(emailListText)
            .then(() => {
                showToast('Email list copied to clipboard', 'success');
            })
            .catch(() => {
                // Fallback to older method if Clipboard API fails
                fallbackCopyToClipboard(emailListText);
            });
    } else {
        // Fallback for browsers that don't support Clipboard API
        fallbackCopyToClipboard(emailListText);
    }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard(text) {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Make it invisible but part of the document
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);

    // Select and copy
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('Email list copied to clipboard', 'success');
        } else {
            showToast('Failed to copy email list', 'error');
        }
    } catch (err) {
        showToast('Failed to copy: ' + err, 'error');
    }

    // Clean up
    document.body.removeChild(textArea);
}

// Download email list as text file
function downloadEmailListAsText() {
    const emails = $('#emailListText').val();
    const blob = new Blob([emails], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'email_list.txt');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Email list downloaded', 'success');
}




// Show toast notification
function showToast(message, type = 'info') {
    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success' :
        type === 'error' ? 'bg-danger' :
            'bg-info';

    const toast = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-delay="3000">
            <div class="toast-header ${bgClass} text-white">
                <strong class="mr-auto">Newsletter Admin</strong>
                <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    $('#toastContainer').append(toast);
    $(`#${toastId}`).toast('show');

    // Remove toast after it's hidden
    $(`#${toastId}`).on('hidden.bs.toast', function() {
        $(this).remove();
    });
}

// Validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function highlightNewSubscribers() {
    if (typeof newSubscriberIds !== 'undefined' && newSubscriberIds.length > 0) {
        newSubscriberIds.forEach(id => {
            const row = $(`#subscribersList tr[data-id="${id}"]`);
            if (row.length) {
                row.addClass('new-subscriber-row');
                // Add the "New" badge to the row
                const statusCell = row.find('td:nth-child(4)');
                if (!statusCell.find('.badge-info').length) {
                    statusCell.append(' <span class="badge badge-pill badge-info ml-2">New</span>');
                }
            }
        });
    }
}

// Enhanced filter function to include "new" filter
function enhancedFilterSubscribers(searchText, statusFilter) {
    // First hide all rows
    $('#subscribersList tr').hide();

    // Special case for "new" filter
    if (statusFilter === 'new' && typeof newSubscriberIds !== 'undefined') {
        newSubscriberIds.forEach(id => {
            const row = $(`#subscribersList tr[data-id="${id}"]`);
            if (row.length) {
                // If there's search text, check if it matches
                if (!searchText || row.text().toLowerCase().includes(searchText)) {
                    row.show();
                }
            }
        });
        return;
    }

    // Apply regular filtering for other cases
    $('#subscribersList tr').each(function() {
        const rowText = $(this).text().toLowerCase();
        const email = $(this).find('td:nth-child(2)').text().toLowerCase();
        const active = $(this).find('td:nth-child(4)').text().includes('Active');

        let statusMatch = false;

        if (statusFilter === 'all') {
            statusMatch = true;
        } else if (statusFilter === 'active' && active) {
            statusMatch = true;
        } else if (statusFilter === 'inactive' && !active) {
            statusMatch = true;
        }

        if (statusMatch && (!searchText || rowText.includes(searchText) || email.includes(searchText))) {
            $(this).show();
        }
    });

    // Update pagination after filtering
    updatePagination();
}

// Modify your existing event handlers to use the enhanced filter
// For example, replace your existing filter code with:
$('#searchInput, #statusFilter').on('input change', function() {
    const searchText = $('#searchInput').val().toLowerCase();
    const statusFilter = $('#statusFilter').val();
    enhancedFilterSubscribers(searchText, statusFilter);
});

// Add this to your document ready function
$(document).ready(function() {
    // Your existing code...

    // Apply highlights after data is loaded
    const originalLoadSubscribers = window.loadSubscribers || function(){};
    window.loadSubscribers = function() {
        originalLoadSubscribers.apply(this, arguments);

        // Add a slight delay to ensure DOM is updated
        setTimeout(highlightNewSubscribers, 500);
    };

    // Show welcome modal
    if (typeof newSubscriberIds !== 'undefined' && newSubscriberIds.length > 0) {
        $('#welcomeBackModal').modal('show');
    }

    // Add sort functionality
    $('#sortFilter').on('change', function() {
        const sortValue = $(this).val();
        sortSubscribers(sortValue);
    });
});

// Function to sort subscribers
function sortSubscribers(sortType) {
    const rows = $('#subscribersList tr').get();

    rows.sort(function(a, b) {
        let compA, compB;

        if (sortType === 'email_asc' || sortType === 'email_desc') {
            compA = $(a).find('td:nth-child(2)').text().toLowerCase();
            compB = $(b).find('td:nth-child(2)').text().toLowerCase();
        } else if (sortType === 'date_asc' || sortType === 'date_desc') {
            compA = new Date($(a).find('td:nth-child(3)').attr('data-date') || 0);
            compB = new Date($(b).find('td:nth-child(3)').attr('data-date') || 0);
        }

        // Default sorting (for invalid sort types)
        if (compA === undefined || compB === undefined) {
            return 0;
        }

        // Apply sort direction
        if (sortType.endsWith('_desc')) {
            return compB < compA ? -1 : compB > compA ? 1 : 0;
        } else {
            return compA < compB ? -1 : compA > compB ? 1 : 0;
        }
    });

    // Replace current rows with sorted ones
    $.each(rows, function(index, row) {
        $('#subscribersList').append(row);
    });

    // Update pagination after sorting
    updatePagination();

    // Re-highlight new subscribers
    highlightNewSubscribers();
}