var pageNumber = 'active';

function getProjects(activity)
{
  yearData = {
    activity: activity
  }
  $.ajax({
    url: "../actions/projectsAPI.php",
    type: "GET",
    data: yearData,
    dataType: "json",
    success: function(data) {
      console.log(data);
      insertData(data);
    },
    error: function() {
      console.log("An error occurred.");
    },
  });
}

function insertData(data)
{
  let items = data;

  $('#existingPostInformation').empty();

  items.forEach(function(item) {
    let id = item.id;
    let title = item.title;
    let description = item.description;
    let orderOfDisplay = item.orderOfDisplay;
    let active = item.active;

    // Create a Bootstrap card div element with the data
    let card = $('<div>').addClass('card shadow-grow mb-4');
    let cardBody = $('<div>').addClass('card-body');
    $('<h5>').addClass('card-title').text(title).appendTo(cardBody);
    //$('<p>').addClass('card-text').text('Location: ' + location).appendTo(cardBody);
    $('<p>').addClass('card-text').text('ID: ' + id).appendTo(cardBody);
    $('<p>').addClass('card-text').text('Description: ' + description).appendTo(cardBody);
    $('<p>').addClass('card-text').text('Order of display: ' + orderOfDisplay).appendTo(cardBody);

    card.append(cardBody);

    // Add padding to the card
    card.css('padding', '20px');

    // Add mouse-over hover effect
    card.hover(
      function() {
        $(this).addClass('shadow-lg');
      },
      function() {
        $(this).removeClass('shadow-lg');
      }
    );

    // Open modal with inputs filled when the photo is clicked
    card.click(function() {
      openProjectInfo(id, title, description, active, orderOfDisplay);
    });

    // Append the card to the existingPhotoInformation element
    $('#existingPostInformation').append(card);
  });
}

function openProjectInfo(id, title, description, active, orderOfDisplay) {

  document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-danger" onclick="deleteWork()">Delete Project</button>';

  if (active == 0)
  {
    document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-info" onclick="restoreWork()">Restore post</button>';
  }

  var openActiveYes = document.getElementById('editActiveYesPost');
  var openActiveNo = document.getElementById('editActiveNoPost');

  // Set the values of the modal inputs
  $('#projectId').val(id);
  $('#editProjectTitle').val(title);
  $('#editProjectDescription').val(description);
  $('#editOrderOfDisplay').val(orderOfDisplay);


  if (active == 1)
  {
    openActiveYes.checked = true;
  }
  else
  {
    openActiveNo.checked = true;
  }

  // Open the Bootstrap modal
  $('#projectUpdateModal').modal('show');
}

function openPostForm()
{
  $("#projectPostModal").modal('show');
}

function createProject() {

  let isActiveProject = $('input[name=isActivePost]:checked').val(); // Retrieve the selected radio button value


  let projectInt = 1;

  if (isActiveProject != 'true')
  {
        projectInt = 0;
  }

  var postData = new FormData();
  postData.append('title', $('#titlePostName').val());
  postData.append('description', $('#projectDescription').val());
  postData.append('active', projectInt);
  postData.append('orderOfDisplay', $('#postOrderOfDisplay').val());


	document.getElementById('uploadWorkButton').disabled = true;

  $.ajax({
    url: '../actions/projectsAPI.php',
    type: 'POST',
    data: postData,
    processData: false,
    contentType: false,
    success: function(response) {
      console.log('Data saved successfully!');
      getProjects(pageNumber);
      $('#projectPostModal').modal('hide');
      document.getElementById('uploadWorkButton').disabled = false;
    },
    error: function(xhr, status, error) {
      console.error('Error:', error);
      document.getElementById('uploadWorkButton').disabled = false;
    }
  });
}

function updateWork()
{
  // Get the form data
  let isActive = $('input[name=editIsActivePost]:checked').val(); // Retrieve the selected radio button value

  let activeInt = 1;

  if (isActive != 'true')
  {
        activeInt = 0;
  }

  var formData = {
    id: $('#projectId').val(),
    title: $('#editProjectTitle').val(),
    description: $('#editProjectDescription').val(),
    orderOfDisplay: $('#editOrderOfDisplay').val(),
    active : activeInt
  };

console.log(formData);
  // Send the form data via AJAX
  $.ajax({
    url: '../actions/projectsAPI.php',
    type: 'PATCH',
    data: formData,
    success: function(response) {

      getProjects(pageNumber);

      console.log('Data updated successfully!');
      console.log(formData);
      $('#projectUpdateModal').modal('hide');

      // You can perform additional actions here
    },
    error: function(xhr, status, error) {
      // Handle the error response
      $('#errorToast').toast('show');
      console.error('Error:', error);
      // You can perform error handling here
    }
  });
}

function deleteWork()
{
  {
    var formData = {
      id: $('#photoId').val(),
    };
    $.ajax({
      url: '../actions/picturesAPI.php',
      type: 'DELETE',
      data: formData,
      success: function(response) {
        getAllWorks('everything')
        $('#photoUpdateModal').modal('hide');
      },
      error: function(xhr, status, error) {
        $('#errorToast').toast('show');
        console.error('Error:', error);
      }
    });
  }
}

function restoreWork()
{
  {
    var formData = {
      id: $('#photoId').val(),
    };
    $.ajax({
      url: '../actions/picturesAPI.php',
      type: 'PUT',
      data: formData,
      success: function(response) {
        getAllWorks('invisible')
        $('#photoUpdateModal').modal('hide');
      },
      error: function(xhr, status, error) {
        $('#errorToast').toast('show');
        console.error('Error:', error);
      }
    });
  }
}
