$(document).ready(function() {
  fetchCurrentAboutMe();
});

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
        var description = data.description.replace(/\n/g, "<br>");
        var pictureLocation = data.pictureLocation;
        $('#currentAboutMe').html(description);
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



