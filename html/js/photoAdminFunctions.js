var pageNumber = 0;

function getAllWorks(theYear)
{
  pageNumber = theYear;
  yearData = {
    theYear: theYear
  }
  $.ajax({
    url: "../actions/picturesAPI.php",
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

  $('#existingPhotoInformation').empty();

  items.forEach(function(item) {
    let id = item.id;
    let location = "../baseImages/"+item.location;
    let name = item.name;
    let firstDescription = item.firstDescription;
    let secondDescription = item.secondDescription;
    let medium = item.medium;
    let isColor = item.isColor;
    let availability = item.availability;
    let creationYear = item.creationYear;
    let orderOfDisplay = item.orderOfDisplay;
    let carousel = item.carousel;
    let visible = item.visible;
    let isSelectWork = item.isSelectWork;

    // Create a Bootstrap card div element with the data
    let card = $('<div>').addClass('card shadow-grow mb-4');
    let image = $('<img>').addClass('card-img-top').attr('src', location).attr('alt', name).css('max-width', '300px');
    let cardBody = $('<div>').addClass('card-body');
    $('<h5>').addClass('card-title').text(name).appendTo(cardBody);
    //$('<p>').addClass('card-text').text('Location: ' + location).appendTo(cardBody);
    $('<p>').addClass('card-text').text('ID: ' + id).appendTo(cardBody);
    $('<p>').addClass('card-text').text('Description: ' + firstDescription).appendTo(cardBody);
    $('<p>').addClass('card-text').text('Medium: ' + medium).appendTo(cardBody);
    $('<p>').addClass('card-text').text('Is Color: ' + isColor).appendTo(cardBody);
    $('<p>').addClass('card-text').text('Availability: ' + availability).appendTo(cardBody);
    $('<p>').addClass('card-text').text('Creation Year: ' + creationYear).appendTo(cardBody);
    $('<p>').addClass('card-text').text('OrderOfDisplay: ' + orderOfDisplay).appendTo(cardBody);
    $('<p>').addClass('card-text').text('Included in the carousel: ' + carousel).appendTo(cardBody);
    card.append(image, cardBody);

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
      openPhotoInfo(id, location, name, firstDescription, secondDescription, medium, isColor, availability, creationYear, orderOfDisplay, carousel, visible, isSelectWork);
    });

    // Append the card to the existingPhotoInformation element
    $('#existingPhotoInformation').append(card);
  });
}

function openPhotoInfo(id, location, name, firstDescription, secondDescription, medium, isColor, availability, creationYear, orderOfDisplay, carousel, visible, isSelectWork) {

  console.log(isSelectWork);
  document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-danger" onclick="deleteWork()">Delete post</button>';

  if (visible == 0)
  {
    document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-info" onclick="restoreWork()">Restore post</button>';
  }

  var openColorYes = document.getElementById('colorYesEdit');
  var openColorNo = document.getElementById('colorNoEdit');
  var openAvailableYes = document.getElementById('availableYesEdit');
  var openAvailableNo = document.getElementById('availableNoEdit');
  var openCarouselYes = document.getElementById('carouselYesEdit');
  var openCarouselNo = document.getElementById('carouselNoEdit');
  var openSelectWorksYes = document.getElementById('selectWorksYesEdit');
  var openSelectWorksNo = document.getElementById('selectWorksNoEdit');

  // Set the values of the modal inputs
  $('#photoId').val(id);
  //$('#photoLocation').val(location);
  $('#photoName').val(name);
  $('#photoFirstDescription').val(firstDescription);
  $('#photoSecondDescription').val(secondDescription);
  //$('#photoMedium').val(medium);


  var selectElement = document.getElementById("photoMedium");
  for (var i = 0; i < selectElement.options.length; i++) {
  if (selectElement.options[i].value === medium) {
    selectElement.options[i].selected = true;
    break; // Exit the loop once the option is selected
  }
}

  //let projectsAsMenuItems = getProjectsAsMenuItems();


  //$('#photoIsColor').val(isColor);
  //var isColor = document.querySelector('input[name="isColor"]:checked').value;

  //$('#photoAvailability').val(availability);
  $('#photoCreationYear').val(creationYear);
  $('#updateOrderOfDisplay').val(orderOfDisplay);


  if (isColor == 1)
  {
    openColorYes.checked = true;
  }
  else
  {
    openColorNo.checked = true;
  }

  if (availability == 1)
  {
    openAvailableYes.checked = true;
  }
  else
  {
    openAvailableNo.checked = true;
  }

  if (carousel == 1)
  {
    openCarouselYes.checked = true;
  }
  else
  {
    openCarouselNo.checked = true;
  }

  if (isSelectWork == 1)
  {
    openSelectWorksYes.checked = true;
  }
  else
  {
    openSelectWorksNo.checked = true;
  }

  // Open the Bootstrap modal
  $('#photoUpdateModal').modal('show');
}

function openPostForm()
{
  $("#photoPostModal").modal('show');
}

function postPhoto() {

  let isColor = $('input[name=isColorPost]:checked').val(); // Retrieve the selected radio button value
  let isAvailable = $('input[name=isAvailablePost]:checked').val(); // Retrieve the selected radio button value
  let isCarousel = $('input[name=isCarouselPost]:checked').val(); // Retrieve the selected radio button value
  let isSelectWork = $('input[name=isSelectWorksPost]:checked').val(); // Retrieve the selected radio button value


  let colorInt = 1;
  let availableInt = 1;
  let carouselInt = 1;
  let selectWorkInt = 1;

  if (isColor != 'true')
  {
        colorInt = 0;
  }

  if (isAvailable != 'true')
  {
        availableInt = 0;
  }

  if (isCarousel != 'true')
  {
        carouselInt = 0;
  }

  if (isSelectWork != 'true')
  {
        selectWorkInt = 0;
  }

   var fileInput = $('#photoPostUpload')[0].files[0];
  // console.log(fileInput);
  //
  // return;

  var postData = new FormData();
  postData.append('name', $('#photoPostName').val());
  postData.append('firstDescription', $('#photoPostFirstDescription').val());
  postData.append('secondDescription', $('#photoPostSecondDescription').val());
  postData.append('medium', $('#photoPostMedium').val());
  //postData.append('isColor', $('#photoPostIsColor').val());
  //postData.append('availability', $('#photoPostAvailability').val());
  postData.append('isColor', colorInt);
  postData.append('availability', availableInt);
  postData.append('creationYear', $('#photoPostCreationYear').val());
  postData.append('photo', fileInput);
  postData.append('orderOfDisplay', $('#postOrderOfDisplay').val());
  postData.append('carousel', carouselInt);
  postData.append('selectWork', selectWorkInt);

// console.log(postData);
//   // var fileInput = $('#photoPostUpload')[0].files[0];
//   // postData.append('photo', fileInput);
//   return;

document.getElementById('uploadWorkButton').disabled = true;

  $.ajax({
    url: '../actions/picturesAPI.php',
    type: 'POST',
    data: postData,
    processData: false,
    contentType: false,
    success: function(response) {
      console.log('Data saved successfully!');
      getAllWorks(pageNumber);
      $('#photoPostModal').modal('hide');
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
  let isColor = $('input[name=isColorEdit]:checked').val(); // Retrieve the selected radio button value
  let isAvailable = $('input[name=isAvailableEdit]:checked').val(); // Retrieve the selected radio button value
  let isCarousel = $('input[name=isCarouselEdit]:checked').val(); // Retrieve the selected radio button value
  let isSelectWork = $('input[name=isSelectWorksEdit]:checked').val(); // Retrieve the selected radio button value


  let colorInt = 1;
  let availableInt = 1;
  let carouselInt = 1;
  let selectWorkInt = 1;

  if (isColor != 'true')
  {
        colorInt = 0;
  }

  if (isAvailable != 'true')
  {
        availableInt = 0;
  }

  if (isCarousel != 'true')
  {
        carouselInt = 0;
  }

  if (isSelectWork != 'true')
  {
        selectWorkInt = 0;
  }

  var formData = {
    id: $('#photoId').val(),
    name: $('#photoName').val(),
    firstDescription: $('#photoFirstDescription').val(),
    secondDescription: $('#photoSecondDescription').val(),
    medium: $('#photoMedium').val(),
    isColor: colorInt,
    availability: availableInt,
    creationYear: $('#photoCreationYear').val(),
    orderOfDisplay : $('#updateOrderOfDisplay').val(),
    carousel : carouselInt,
    selectWork : selectWorkInt
  };
console.log(formData);
  // Send the form data via AJAX
  $.ajax({
    url: '../actions/picturesAPI.php',
    type: 'PATCH',
    data: formData,
    success: function(response) {

      getAllWorks(pageNumber);

      console.log('Data updated successfully!');
      console.log(formData);
      $('#photoUpdateModal').modal('hide');

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
