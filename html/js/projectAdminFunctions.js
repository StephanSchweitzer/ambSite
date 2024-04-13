var pageNumber = 'active';
var allProjects = [];
$( document ).ready(function() {
    getProjects(pageNumber)
});

function getProjects(activity) {
    pageNumber = activity;
    yearData = { activity: activity };

    $.ajax({
        url: "../actions/projectsAPI.php",
        type: "GET",
        data: yearData,
        dataType: "json",
        success: function(data) {
            allProjects = data.map(project => ({
                ...project,
                works: []  // Initialize an empty array to hold work IDs
            }));

            document.querySelectorAll('.project-info').forEach(el => el.remove());

            allProjects.forEach(project => {
                fetchWorkIdsForProject(project.id).then(workIds => {
                    project.works = workIds;  // Store work IDs in the project object
                });
            });
            insertData(data);  // You might want to call this after all IDs are fetched if necessary
            getThenPopulateWorks();
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
	fetchWorkIdsForProject(id)

	//getThenPopulateWorks();

	checkWorkCheckboxes(id);
	
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
        showToast('Project successfully created!', 'success');
      getProjects(pageNumber);
      $('#projectPostModal').modal('hide');
      document.getElementById('uploadWorkButton').disabled = false;
    },
    error: function(xhr, status, error) {
      console.error('Error:', error);
      showToast('Project not created, error', 'error');
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
        showToast('Project successfully updated!', 'success');
      getProjects(pageNumber);
      addWorksToProject()
      console.log('Data updated successfully!');
      console.log(formData);
      $('#projectUpdateModal').modal('hide');

      // You can perform additional actions here
    },
    error: function(xhr, status, error) {
      // Handle the error response
      showToast('There was an error', 'error');
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
          showToast('Project successfully deleted!', 'success');
        $('#projectUpdateModal').modal('hide');
      },
      error: function(xhr, status, error) {
        showToast('There was a problem', 'error');
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
        showToast('Project successfully restored!', 'success');
        $('#projectUpdateModal').modal('hide');
      },
      error: function(xhr, status, error) {
        showToast('Error, contact Stef', 'error');
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
	let id = document.getElementById('projectId');
	$.ajax({
    url: "../actions/picturesAPI.php",
    type: "GET",
    data: {'theYear' : 'projectsAPI'},
    dataType: "json",
    success: function(data) {
    	populateWorksList(data);
    	//checkWorkCheckboxes(id);
    	//fetchWorkIdsForProject(id);
      },
    error: function() {
      console.log("An error occurred.");
    },
  });
}





function addWorksToProject() {
    const selectedWorks = document.querySelectorAll('#worksList input[type="checkbox"]:checked');
    const workIds = Array.from(selectedWorks).map(selectedWork => selectedWork.getAttribute('data-work-id')).sort();
    const projectId = document.getElementById('projectId').value;

    // Fetch existing work IDs for this project from allProjects array (assuming it's available globally)
    const currentProject = allProjects.find(project => project.id === projectId);
    if (!currentProject) {
        console.error('Current project not found');
        return;
    }

    // Compare existing work IDs with newly selected work IDs
    const existingWorkIds = currentProject.works.sort();

    // Using JSON.stringify for simple array comparison; consider a more robust method for larger data sets or critical use cases
    if (JSON.stringify(existingWorkIds) === JSON.stringify(workIds)) {
        console.log('No changes in project works; not updating the database.');
        return; // Stop further execution if no changes
    }

    // Continue with database update if there are changes
    postWorksProjectsDB(projectId, workIds);
}

function postWorksProjectsDB(projectId, workIds)
{
	console.log(workIds);
	
$.ajax({
    url: "../actions/worksOfProjectsAPI.php",
    type: "POST",
    data: {'projectId': projectId, 'workIds': workIds},
    dataType: "json",
    success: function(data) {
        showToast('Works successfully added to project', 'success');
        getProjects(pageNumber);
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log("An error occurred: " + textStatus + ", " + errorThrown);
        showToast('There has been a problem, tell bubbers', 'error');
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

function fetchWorkIdsForProject(id) {

    return $.ajax({
        url: '../actions/worksOfProjectsAPI.php',
        type: 'GET',
        data: { 'projectId': id },
        dataType: 'json'
    });
}


function checkWorkCheckboxes(currentProjectId) {
    // Retrieve the current project from the allProjects array
    var currentProject = allProjects.find(project => project.id === currentProjectId);

    if (!currentProject) {
        console.error('Current project not found');
        return; // Exit if the current project is not found
    }

    // Get the work IDs from the current project
    const workIds = currentProject.works || [];

    // First, uncheck all checkboxes
    $('input[type="checkbox"][data-work-id]').prop('checked', false);

    // Check the checkboxes corresponding to the fetched workIds
    workIds.forEach(function(workId) {
        $('input[type="checkbox"][data-work-id="' + workId + '"]').prop('checked', true);
        // Get the list item that contains this checkbox
        var listItem = $('input[type="checkbox"][data-work-id="' + workId + '"]').closest('li');
        appendProjectInfo(workId, listItem[0], currentProjectId);  // Pass the current project ID to exclude it
    });
}

function appendProjectInfo(workId, listItem, excludeProjectId = null) {
    // Remove any existing 'used in' info to avoid duplication
    const existingInfo = listItem.querySelector('.project-info');
    if (existingInfo) {
        listItem.removeChild(existingInfo);
    }
    // Optionally exclude one project from the "Also in" list
    const projects = allProjects.filter(p => p.works.includes(workId) && p.id !== excludeProjectId);
    if (projects.length > 0) {

        const projectNames = projects.map(p => p.title).join(", ");
        const projectInfo = document.createElement('small');
        projectInfo.classList.add('project-info');  // Add class for easy selection/removal
        projectInfo.textContent = "In " + projectNames;
        projectInfo.style.marginLeft = '10px';
        listItem.appendChild(projectInfo);
    }
}


function populateWorksList(works) {
    const worksList = document.getElementById('worksList');
    worksList.innerHTML = '';
    works.forEach(work => {
        const listItem = createListItem(work);
        worksList.appendChild(listItem);
        appendProjectInfo(work.id, listItem);
    });
}

function createListItem(work)
{
    const listItem = document.createElement('li');
    listItem.style.paddingBottom = '10px';
    listItem.style.cursor = 'pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('data-work-id', work.id);
    checkbox.style.transform = "scale(1.5)";
    checkbox.style.marginRight = "20px";

    const thumbnail = document.createElement('img');
    thumbnail.src = '../baseImages/'+work.location;
    thumbnail.alt = work.name;
    thumbnail.style.maxWidth = '50px';
    thumbnail.style.marginRight = "20px";

    const textNode = document.createTextNode(work.name);
    const textSpan = document.createElement('span');
    textSpan.appendChild(textNode);
    textSpan.style.marginLeft = "10px";

    listItem.appendChild(checkbox);
    listItem.appendChild(thumbnail);
    listItem.appendChild(textSpan);

    // Use local data to check project association

    listItem.addEventListener('click', function(event) {
        if (event.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
        }
    });

    return listItem;
}




