var currentPage = 'active';
const list = document.getElementById('navbarLinks');
const navItems = document.querySelectorAll('.dragNavBar');
let draggedItem = null;
let listOfLinks = []

$(document).ready(function () {
    loadAndInsertLinks();
    initializeDisplayTextListeners();
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

function deleteLink(uniqueId) {
    // Remove the corresponding HTML element
    $(`#${uniqueId}`).remove();

    // Find and remove the link entry in the links array
    listOfLinks = listOfLinks.filter(link => link.id !== uniqueId);
}

function insertLinks(links) {
    $('#navbarLinks').empty();
    listOfLinks = links;
    links.forEach(function (link) {
        let id = link.ID;
        let displayedText = link.displayedText;
        let linkRedirection = link.linkRedirection;
        let isChangeable = link.isChangeable;
        let isNewTab = link.isNewTab;

        createNewNavLinkRow(id, displayedText, linkRedirection, isChangeable, isNewTab)
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

function createNewNavLinkRow(id = Date.now(), displayedText = "New Link", linkRedirection = "", isChangeable = 1, isNewTab = 0) {
    // Create the `<li>` element with an ID and draggable property
    const listItem = $('<li>').attr({
        draggable: 'true',
        class: 'dragNavBar navLink',
        id: `navLink_${id}`
    });

    // Create the inner div for alignment
    const innerDiv = $('<div>').addClass('d-flex align-items-center');

    // Add the displayed text span
    const spanText = $('<span>').attr({
        id: `text_navLink_${id}`,
        class: 'me-2'
    }).css('flex', '0 0 20vw').text(displayedText);

    // Display text input field
    const inputDisplayedText = $('<input>').attr({
        type: 'text',
        id: `display_navLink_${id}`,
        placeholder: 'Displayed text',
        value: displayedText
    }).addClass('form-control form-control-sm displayed-text').css({
        flex: '1',
        marginRight: '8px'
    }).on('input', function() {
        updateDisplayedText(`navLink_${id}`);
    });

    const inputLinkRedirection = $('<input>').attr({
        type: 'text',
        id: `link_navLink_${id}`,
        placeholder: isChangeable == 0 ? 'Only Stef can change' : 'Link redirection',
        value: isChangeable == 0 ? '' : linkRedirection,
        disabled: isChangeable == 0
    }).addClass('form-control form-control-sm link-redirection').css('flex', '1');

    // Create the delete button with event handler
    const deleteButton = $('<button>').attr({
        id: `deleteButton_${id}`,
        class: 'btn btn-danger',
        style: 'margin-left: 20px;',
        disabled: isChangeable == 0
    }).text('Delete').on('click', function() {
        listItem.remove();
        removeLinkFromArray(id);
    });

    innerDiv.append(spanText, inputDisplayedText, inputLinkRedirection, deleteButton);
    listItem.append(innerDiv);

    $('#navbarLinks').append(listItem);
}

function collectLinksData() {
    let links = [];
    $('.navLink').each(function(index) {
        // Strip the "navLink_" prefix from the ID
        const id = this.id.replace('navLink_', '');
        const displayedText = $(this).find('.displayed-text').val();
        const linkRedirection = $(this).find('.link-redirection').val();
        const isChangeable = $(this).find('.link-redirection').val();
        // Construct the link object with an order index
        links.push({
            id: id,
            displayedText: displayedText,
            linkRedirection: linkRedirection,
            order: index + 1 // 1-based order index
        });
    });

    return links;
}

// Example function to remove the link from your array
function removeLinkFromArray(id) {
    // Assuming `listOfLinks` is an array holding your links
    listOfLinks = listOfLinks.filter(link => link.ID !== id);
}


// Function to update the span text based on input field changes
function updateDisplayedText(uniqueId) {
    const inputDisplay = $(`#display_${uniqueId}`);
    const spanDisplay = $(`#text_${uniqueId}`);
    spanDisplay.text(inputDisplay.val());
}



function saveLinks() {
    let linksToSave = collectLinksData();
    console.log(linksToSave);
    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'POST',
        contentType: 'application/json',  // Ensure content type is set to JSON
        data: JSON.stringify(linksToSave),  // Stringify the JSON data
        success: function (response) {
            console.log(response);
            showToast('Links successfully updated', 'success');
            loadAndInsertLinks();
        },
        error: function () {
            showToast('Error creating link', 'error');
        }
    });
}

function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('myToastContainer');
  const toast = document.createElement('div');
  toast.className = 'myToast'; // Base class
  toast.textContent = message;

  // Apply styles directly
  toast.style.color = '#fff';
  toast.style.backgroundColor = '#25252f';
  toast.style.border = '1px solid #ddd';
  toast.style.borderLeft = '15px solid #00b894';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
  toast.style.width = '300px';
  toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  toast.style.transform = 'translateX(100%)';
  toast.style.opacity = '0';

  // Setting background color based on the type of message
  switch (type) {
      case 'success':
          toast.style.borderLeftColor = '#2ecc71'; // Green for success
          break;
      case 'error':
          toast.style.borderLeftColor = '#e74c3c'; // Red for error
          break;
      default:
          toast.style.borderLeftColor = '#3498db'; // Blue for general info
  }

  // Append the toast to the container
  toastContainer.appendChild(toast);
  setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
  }, 100); // Delay to allow CSS transition

  // Automatically remove the toast
  setTimeout(() => {
      toastContainer.removeChild(toast);
  }, 5000); // Display for 4 seconds
}




//managing the user interface below


function updateLinks()
{
    return
}



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
    console.log("Order updated:", Array.from(list.children).map(item => item.id));
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



