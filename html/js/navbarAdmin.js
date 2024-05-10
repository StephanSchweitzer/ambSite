var currentPage = 'active';

$(document).ready(function () {
    // Load and insert the nav links on page load
    loadAndInsertLinks();
    //initializeDisplayTextListeners();
});

function loadAndInsertLinks() {
    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            if (response.status === 'success') {
                insertLinks(response.data);
            } else {
                showToast('Error fetching navigation links', 'error');
            }
        },
        error: function () {
            showToast('An error occurred while fetching links', 'error');
        }
    });
}

function insertLinks(links) {
    //$('#navbarLinks').empty();
    console.log(links);
    return;
    links.forEach(function (link) {
        let id = link.ID;
        let displayedText = link.displayedText;
        let linkRedirection = link.linkRedirection;

        // Create the list item
        let listItem = $('<li>').addClass('dragNavBar').attr('id', `navLink_${id}`).attr('draggable', true);

        // Create the inner div for alignment
        let innerDiv = $('<div>').addClass('d-flex align-items-center');

        // Add the displayed text span
        let spanText = $('<span>').attr('id', `text_navLink_${id}`).addClass('me-2').css('flex', '0 0 20vw').text(displayedText);

        // Add the input fields for editing displayed text and link redirection
        let inputDisplayedText = $('<input>').attr({
            type: 'text',
            id: `display_navLink_${id}`,
            placeholder: 'Displayed text',
            value: displayedText
        }).addClass('form-control form-control-sm').css({ flex: '1', marginRight: '8px' }).on('input', function () {
            updateDisplayedText(`navLink_${id}`);
        });

        let inputLinkRedirection = $('<input>').attr({
            type: 'text',
            id: `link_navLink_${id}`,
            placeholder: isChangeable == 0 ? 'Talk to stef to change' : 'Link redirection',
            value: linkRedirection,
            disabled: isChangeable == 0 // Disables the input field if isChangeable is 0
        }).addClass('form-control form-control-sm').css('flex', '1');


        // Append elements to the inner div and then to the list item
        innerDiv.append(spanText, inputDisplayedText, inputLinkRedirection);
        listItem.append(innerDiv);

        // Add a click event to open the edit modal when the list item is clicked
        listItem.click(function () {
            openLinkEditModal(id, displayedText, linkRedirection);
        });

        // Append the list item to the container
        $('#navLinksContainer').append(listItem);
    });
}

// Function to initialize the event listener for all display text input fields
function initializeDisplayTextListeners() {
    // Add an event listener to all display text input fields
    $('input[id^="display_"]').on('input', function () {
        // Extract the unique identifier from the input field's ID
        const uniqueId = $(this).attr('id').split('_')[1];

        // Call your `updateDisplayedText` function using the extracted ID
        updateDisplayedText(uniqueId);
    });
}

function createNewNavLinkRow() {
    // Generate a unique ID for the new row
    const uniqueId = `navLinkRow_${new Date().getTime()}`;

    // Create the new `<li>` element
    const newRow = $('<li>').attr({
        draggable: 'true',
        class: 'dragNavBar',
        id: uniqueId
    });

    // Create the row content structure with the input fields
    const content = $('<div>').addClass('d-flex align-items-center');

    // Add the displayed text span
    const spanDisplayedText = $('<span>').attr({
        id: `text_${uniqueId}`,
        class: 'me-2'
    }).css({
        'flex': '0 0 20vw'
    }).text('New Link');

    // Display text input field
    const inputDisplayText = $('<input>').attr({
        type: 'text',
        id: `display_${uniqueId}`,
        placeholder: 'Displayed text'
    }).addClass('form-control form-control-sm').css({
        'flex': '1',
        'margin-right': '8px'
    }).on('input', function() {
        updateDisplayedText(uniqueId);
    });

    // Link redirection input field
    const inputLinkRedirection = $('<input>').attr({
        type: 'text',
        id: `link_${uniqueId}`,
        placeholder: 'Link redirection'
    }).addClass('form-control form-control-sm').css('flex', '1');

    // Append elements to the content div and then to the new row
    content.append(spanDisplayedText).append(inputDisplayText).append(inputLinkRedirection);
    newRow.append(content);

    // Append the new row to the navbar list
    $('#navbarLinks').append(newRow);
}

// Function to update the span text based on input field changes
function updateDisplayedText(uniqueId) {
    const inputDisplay = $(`#display_${uniqueId}`);
    const spanDisplay = $(`#text_${uniqueId}`);
    spanDisplay.text(inputDisplay.val());
}



function saveLinks() {
    var postData = {
        displayedText: $('#newDisplayedText').val(),
        linkRedirection: $('#newLinkRedirection').val(),
        displayedOrder: $('#newDisplayedOrder').val()
    };

    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'POST',
        data: postData,
        success: function (response) {
            showToast('Link created successfully', 'success');
            loadAndInsertLinks();
            $('#linkCreateModal').modal('hide');
        },
        error: function () {
            showToast('Error creating link', 'error');
        }
    });
}

function updateLink() {
    var updateData = {
        ID: $('#editLinkID').val(),
        displayedText: $('#editDisplayedText').val(),
        linkRedirection: $('#editLinkRedirection').val(),
        displayedOrder: $('#editDisplayedOrder').val()
    };

    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'PATCH',
        data: updateData,
        success: function (response) {
            showToast('Link updated successfully', 'success');
            loadAndInsertLinks();
            $('#linkEditModal').modal('hide');
        },
        error: function () {
            showToast('Error updating link', 'error');
        }
    });
}

function deleteLink() {
    var deleteData = {
        ID: $('#editLinkID').val()
    };

    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'DELETE',
        data: deleteData,
        success: function (response) {
            showToast('Link deleted successfully', 'success');
            loadAndInsertLinks();
            $('#linkEditModal').modal('hide');
        },
        error: function () {
            showToast('Error deleting link', 'error');
        }
    });
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    toast.style.width = '300px';
    toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';

    switch (type) {
        case 'success':
            toast.style.borderLeftColor = '#2ecc71';
            break;
        case 'error':
            toast.style.borderLeftColor = '#e74c3c';
            break;
        default:
            toast.style.borderLeftColor = '#3498db';
    }

    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 100);

    setTimeout(() => {
        toastContainer.removeChild(toast);
    }, 5000);
}





//managing the user interface below


function updateLinks()
{
    return
}

const list = document.getElementById('navbarLinks');
const navItems = document.querySelectorAll('.dragNavBar');
let draggedItem = null;

list.addEventListener('dragstart', function (e) {
    draggedItem = e.target;
    // Add the 'dragging' class to the dragged item
    e.target.classList.add('dragging');

    // Temporarily disable hover effects on all dragNavBar items
    navItems.forEach(item => {
        item.classList.add('dragging');
    });
    draggedItem.style.opacity = '0.5';

});

list.addEventListener('dragover', function(e) {
    e.preventDefault(); // Necessary to allow dropping
    const target = e.target.closest('li'); // Ensure we get the LI even if nested elements are targeted
    if (target && target !== draggedItem) {
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2; // Get the vertical mid-point
        if (e.clientY - offset > 0) {
            target.after(draggedItem);
        } else {
            target.before(draggedItem);
        }
    }
});

list.addEventListener('dragend', function(e) {
    // Remove the 'dragging' class
    e.target.classList.remove('dragging');

    // Re-enable hover effects on all items
    navItems.forEach(item => {
        item.classList.remove('dragging');
    });
    draggedItem.style.opacity = '';

    updateNavbarOrder();
});

function updateNavbarOrder() {
    // Log the updated order for demonstration purposes
    console.log("Order updated:", Array.from(list.children).map(item => item.textContent));
    // Implement server call or local storage update here if necessary
}

list.addEventListener('dragenter', function(e) {
    e.preventDefault();
    // Manage the insert position here, without changing styles
});

list.addEventListener('dragleave', function(e) {
    // Optionally manage hover effect here if needed
});

list.addEventListener('drop', function(e) {
    // Drop event logic here
});



