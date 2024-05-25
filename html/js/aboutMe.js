$(document).ready(function() {
  fetchCurrentAboutMe();
});

var currentAboutMe = '';


function postNewAboutMePhoto()
{

  //I need to do this so that in both functions, it gets the info that isn't included
  //or references the last input if one incoming value is null and then copy that into the new one


    let fileInput = $('#aboutMePhoto')[0].files[0];
    let postData = new FormData();

    postData.append('photo', fileInput);
    postData.append('description', currentAboutMe);

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
      showToast('Your work has been successfully posted!', 'success');

    },
    error: function(xhr, status, error) {
      showToast('There has been a problem, tell bubbers', 'error');
      console.error('Error:', error);
      document.getElementById('uploadWorkButton').disabled = false;
    }
  });
}

function postNewAboutMe() {
  description = document.getElementById('aboutMeText').value;

  $.ajax({
    url: '../actions/aboutMeAPI.php', // Replace with the path to your PHP API script
    type: 'POST',
    data: {
      description: description
    },
    dataType: 'json',
    success: function(response) {
      if (response.status === 'success') {
        console.log('Entry successfully added.');
        fetchCurrentAboutMe();
      } else {
        console.error('Error adding entry:', response.message);
        // Additional error handling logic here
      }
    },
    error: function(xhr, status, error) {
      console.error('AJAX error:', status, error);
      // Additional AJAX error handling logic here
    }
  });
}

    // Function to fetch and display the 'about me' content
function fetchCurrentAboutMe() {
  $.ajax({
    url: '../actions/aboutMeAPI.php', // Replace with the correct path to your PHP script
    type: 'GET',
    dataType: 'json',
    success: function(data) 
    {
      if(data) 
      {
        currentAboutMe = data.description;
        var description = data.description.replace(/\n/g, "<br>");
        var pictureLocation = "../" + data.pictureLocation;
        $('#currentAboutMe').html(description);
        var imgElement = $('<img>').attr('src', pictureLocation).attr('alt', 'About Me Picture').css('max-width', '400px');
        $('#currentAboutMePicture').empty().append(imgElement);
      } else 
      {
        $('#currentAboutMe').html('No current information available.');
      }
    },
    error: function(jqXHR, textStatus, errorThrown)
    {
      console.error('Error fetching current about me:', textStatus, errorThrown);
      $('#currentAboutMe').html('Error loading information.');
    }
  });
}



