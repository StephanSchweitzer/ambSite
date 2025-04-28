$(document).ready(function() {
    fetchCurrentAboutMe();
    setupEventListeners();
});

// Global variables
var currentAboutMe = '';
var currentPictureLocation = '';
var newPhotoSelected = false;

// Set up event listeners
function setupEventListeners() {
    // Handle file input change
    $('#aboutMePhoto').on('change', function() {
        let fileName = $(this).val().split('\\').pop();
        if (fileName) {
            $(this).next('.custom-file-label').html(fileName);
            newPhotoSelected = true;
        } else {
            $(this).next('.custom-file-label').html('Choose file...');
            newPhotoSelected = false;
        }
    });

    // Preview text button
    $('#previewTextButton').on('click', function() {
        const text = $('#aboutMeText').val();
        if (text.trim()) {
            $('#textPreview').html(text.replace(/\n/g, '<br>'));
            $('#textPreviewSection').show();
        } else {
            showToast('Please enter some text to preview', 'warning');
        }
    });

    // Cancel photo button
    $('#cancelPhotoButton').on('click', function() {
        resetPhotoInput();
    });

    // Submit unified form
    $('#updateAboutMeForm').on('submit', function(e) {
        e.preventDefault();
        updateAboutMe();
    });
}

// Reset photo input and preview
function resetPhotoInput() {
    $('#aboutMePhoto').val('');
    $('#aboutMePhoto').next('.custom-file-label').html('Choose file...');
    $('#newPhotoPreview').hide().empty();
    $('#cancelPhotoButton').hide();
    newPhotoSelected = false;
}

// Preview the selected photo before upload
function previewNewPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function(e) {
            $('#newPhotoPreview').empty().show();
            $('<img>')
                .attr('src', e.target.result)
                .css('max-width', '100%')
                .css('max-height', '300px')
                .appendTo('#newPhotoPreview');
            $('#cancelPhotoButton').show();
        };

        reader.readAsDataURL(input.files[0]);
    }
}

// Unified function to update About Me (both photo and description)
function updateAboutMe() {
    const description = $('#aboutMeText').val();

    if (!description.trim()) {
        showToast('Please enter a description', 'warning');
        return;
    }

    $('#updateAboutMeButton').prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Updating...');

    let postData = new FormData();
    postData.append('description', description);

    // Add current picture location if no new photo is selected
    if (!newPhotoSelected && currentPictureLocation) {
        postData.append('currentPictureLocation', currentPictureLocation);
    }

    // Add new photo if selected
    if (newPhotoSelected) {
        const fileInput = $('#aboutMePhoto')[0].files[0];
        if (fileInput) {
            postData.append('photo', fileInput);
        }
    }

    $.ajax({
        url: '../actions/aboutMeAPI.php',
        type: 'POST',
        data: postData,
        processData: false,
        contentType: false,
        success: function(response) {
            try {
                // Parse the response if it's a string
                if (typeof response === 'string') {
                    response = JSON.parse(response);
                }

                if (response.status === 'success') {
                    console.log('About Me successfully updated.');
                    fetchCurrentAboutMe();
                    resetPhotoInput();
                    $('#textPreviewSection').hide();
                    showToast('Your About Me information has been successfully updated!', 'success');
                } else {
                    console.error('Error updating About Me:', response.message);
                    showToast('Error updating About Me: ' + (response.message || 'Unknown error'), 'error');
                }
            } catch (e) {
                console.error('Error parsing response:', e);
                showToast('Error processing server response', 'error');
            }
            $('#updateAboutMeButton').prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Update About Me');
        },
        error: function(xhr, status, error) {
            console.error('AJAX error:', status, error);

            // Try to extract more detailed error message
            let errorMessage = 'There has been a problem updating your About Me information';
            try {
                if (xhr.responseText) {
                    const responseObj = JSON.parse(xhr.responseText);
                    if (responseObj && responseObj.message) {
                        errorMessage = responseObj.message;
                    }
                }
            } catch (e) {
                console.error('Could not parse error response:', e);
            }

            showToast('Error updating About Me: ' + errorMessage, 'error');
            $('#updateAboutMeButton').prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Update About Me');
        }
    });
}

// Fetch current About Me content
function fetchCurrentAboutMe() {
    $.ajax({
        url: '../actions/aboutMeAPI.php',
        type: 'GET',
        dataType: 'json',
        success: function(data) {
            if (data) {
                currentAboutMe = data.description;
                currentPictureLocation = data.pictureLocation;

                // Update the description display
                var description = data.description.replace(/\n/g, "<br>");
                $('#currentAboutMe').html(description);

                // Update the image display
                if (data.pictureLocation && data.pictureLocation !== 'unavailable') {
                    var pictureLocation = "../" + data.pictureLocation;
                    var imgElement = $('<img>')
                        .attr('src', pictureLocation)
                        .attr('alt', 'About Me Picture')
                        .addClass('img-fluid');

                    $('#currentAboutMePicture').empty().append(imgElement);
                    $('#currentPhotoFilename').text(data.pictureLocation.split('/').pop());
                    $('.no-image-placeholder').hide();
                } else {
                    $('#currentAboutMePicture').html(`
                      <div class="no-image-placeholder">
                        <i class="fas fa-image"></i>
                        <p>No image currently set</p>
                      </div>
                    `);
                    $('#currentPhotoFilename').text('');
                    currentPictureLocation = '';
                }

                // Fill the textarea with the current description for easy editing
                $('#aboutMeText').val(data.description);
            } else {
                $('#currentAboutMe').html('<div class="text-muted">No current information available.</div>');
                $('#currentAboutMePicture').html(`
                  <div class="no-image-placeholder">
                    <i class="fas fa-image"></i>
                    <p>No image currently set</p>
                  </div>
                `);
                currentPictureLocation = '';
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('Error fetching current about me:', textStatus, errorThrown);
            $('#currentAboutMe').html('<div class="text-danger">Error loading information.</div>');
            showToast('Error loading current About Me information', 'error');
        }
    });
}

// Show a toast notification
function showToast(message, type) {
    const toastId = 'toast-' + Date.now();
    const toastClasses = {
        'success': 'bg-success',
        'error': 'bg-danger',
        'warning': 'bg-warning',
        'info': 'bg-info'
    };

    const toastHtml = `
    <div id="${toastId}" class="toast custom-toast ${toastClasses[type] || 'bg-dark'}" role="alert" aria-live="assertive" aria-atomic="true" data-delay="5000">
      <div class="toast-header">
        <strong class="mr-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
        <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="toast-body text-white">
        ${message}
      </div>
    </div>
  `;

    $('.toast-container').append(toastHtml);
    $(`#${toastId}`).toast('show');

    // Remove toast after it's hidden
    $(`#${toastId}`).on('hidden.bs.toast', function() {
        $(this).remove();
    });
}