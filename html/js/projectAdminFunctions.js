var pageNumber = 'active';

function getProjects(activity)
{
	pageNumber = activity;
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
    let deleted = item.deleted;

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
      openProjectInfo(id, title, description, active, orderOfDisplay, deleted);
    });

    // Append the card to the existingPhotoInformation element
    $('#existingPostInformation').append(card);
  });
}

function openProjectInfo(id, title, description, active, orderOfDisplay, deleted) {
	getThenPopulateWorks();
  document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-danger" onclick="deleteWork()">Delete Project</button>';

  if (deleted == 1)
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

	populateWorksList();

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
    id: $('#projectId').val(),
  	};
    $.ajax({
      url: '../actions/projectsAPI.php',
      type: 'DELETE',
      data: formData,
      success: function(response) {
        getProjects('everything')
        $('#projectUpdateModal').modal('hide');
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

    $.ajax({
      url: '../actions/projectsAPI.php',
      type: 'PATCH',
      data: formData,
      success: function(response) {
        getProjects('invisible')
        $('#projectUpdateModal').modal('hide');
      },
      error: function(xhr, status, error) {
        $('#errorToast').toast('show');
        console.error('Error:', error);
      }
    });
  }

function getProjectsAsMenuItems()
{
  let dropDownOptionsText = "";
    yearData = 
    $.ajax({
    url: "../actions/projectsAPI.php",
    type: "GET",
    data: { activity: 'active' },
    dataType: "json",
    success: function(data) {
      console.log(data);
      //insertData(data);
      dropDownOptionsText = makeProjectsDropDownText(data);
      console.log(dropDownOptionsText);
    },
    error: function() {
      console.log("An error occurred.");
    },
  });
    return dropDownOptionsText;
}

function makeProjectsDropDownText(projects)
{
  let finalText = "";

  projects.forEach(project => {
    if(project.deleted === 0) { // Assuming 'deleted' is used to mark soft-deleted projects
      finalText += `<option value="${project.id}">${project.title}</option>`;
    }
  });

  return finalText;
}

function getActiveWorks()
{
	let theWorks;
	$.ajax({
    url: "../actions/picturesAPI.php",
    type: "GET",
    data: {'theYear' : 'Select Works'},
    dataType: "json",
    success: function(data) {
    	theWorks = data;
      console.log(data);
      },
    error: function() {
      console.log("An error occurred.");
    },
  });
	return theWorks;
}

function getThenPopulateWorks()
{
	$.ajax({
    url: "../actions/picturesAPI.php",
    type: "GET",
    data: {'theYear' : 'Select Works'},
    dataType: "json",
    success: function(data) {
    	populateWorksList(data);
      },
    error: function() {
      console.log("An error occurred.");
    },
  });
}

function populateWorksList(works) {

	console.log(works);

    const worksList = document.getElementById('worksList');
    worksList.innerHTML = ''; // Clear existing list

    works.forEach(work => {
        const listItem = document.createElement('li');
        listItem.textContent = work.name; // or work.title
        listItem.setAttribute('data-work-id', work.id);

        // Optional: Add a checkbox or another way to select works
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('data-work-id', work.id);
        listItem.prepend(checkbox);

        worksList.appendChild(listItem);
    });
}

function addWorkToProject(work) {
        const selectedWorks = document.querySelectorAll('#worksList input[type="checkbox"]:checked');
        const workIds = Array.from(selectedWorks).map(selectedWork => selectedWork.getAttribute('data-work-id'));
        console.log(workIds);
}

function removeSelectedWorks() {
    const selectedWorks = document.querySelectorAll('#worksList input[type="checkbox"]:checked');
    selectedWorks.forEach(checkbox => {
        const workId = checkbox.getAttribute('data-work-id');
        // Logic to remove the work from the project using workId
        checkbox.parentElement.remove();
    });
}

// // Event Listeners for Add/Remove buttons
//document.getElementById('addWork').addEventListener('click', () => {
    // Logic to select a work to add
    // Example: addWorkToProject(selectedWork);
//});

// document.getElementById('removeWork').addEventListener('click', removeSelectedWorks);


