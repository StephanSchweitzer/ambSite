var selectWorksAreShown = false;
let currentImageIndex = 0; // Global variable to track the current image index
let images = []; // Global array to store image URLs
let startX, startY, initialTouchDistance, currentX;
let isPinching = false;
var imageIsRows = 'img-containerForRows';
var projectIsRows = 'projectWorksForRows';

$( window ).on( "load", function() {

  //this fixes the width of all thumbnails

  // if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
  // {
  //   $('#popUpImage').removeClass('popUpImage')
  //   $('#popUpImage').addClass('popUpImageMobile')
  //   $('#imagesAndContent').removeClass('imagesAndContent')
  //   $('#imagesAndContent').addClass('imagesAndContentMobile')
  //   $('#blockForHeader').removeClass('blockForHeader')
  //   $('#blockForHeader').addClass('blockForHeaderMobile')
  //   $('#whiteForTheTopMaybe').addClass('headerNoMove3')
  //   $("#whiteForTheTopMaybe").attr('id', 'whiteForTheTop');
  //   $('#whiteForTheTop').addClass('headerNoMove3')
  //   $('#navLinksBox').removeClass('navLinksBox')
  //   $('#navLinksBox').addClass('navLinksBoxMobile')
  //   $('#selectProjectCategories').addClass('hiddenLinkStuff')
  //   $('#selectProjectCategories').addClass('hiddenLinkStuffMobile')
  // }

  $(document).ready(function() {
    $('#bigPicModal').on('click', function(event) {
        // Check if the clicked element is not the title, description, or image
        if (!$(event.target).closest('#popUpImage').length) {
            // If the clicked area is not the title, description, or image, close the modal
            $('#bigPicModal').modal('hide');
        }
    });
});

  $('.size12020').each(function(index, element) {
    let theWidth = this.width;
    $(this).closest('.holdForNow').css("min-width",(theWidth-1)+"px");
    $(this).closest('.holdPhotoandBlack').css("min-width",(theWidth-1)+"px");
    //this corrects the source of the larger images
    //$(this).removeClass('invisible')
    let idOfForm = "#20"+$(this).attr("id")+"IMG";
    console.log(idOfForm);
    let imgPath = $(idOfForm).attr("sourceForJS");
    console.log(imgPath);
    $(idOfForm).attr("src",imgPath);
  });

  $('.size12020New').each(function(index, element) {
    let theWidth = this.width;
    $(this).closest('.holdForNowNew').css("min-width",(theWidth-1)+"px");
    $(this).closest('.holdPhotoandBlackNew').css("min-width",(theWidth-1)+"px");
    //this corrects the source of the larger images
    //$(this).removeClass('invisible')
    let idOfForm = "#20"+$(this).attr("id")+"IMG";
    console.log(idOfForm);
    let imgPath = $(idOfForm).attr("sourceForJS");
    console.log(imgPath);
    $(idOfForm).attr("src",imgPath);
  });

  $('.size12021').each(function(index, element) {
    let theWidth = this.width;
    $(this).closest('.holdForNow').css("min-width",(theWidth-1)+"px");
    $(this).closest('.holdPhotoandBlack').css("min-width",(theWidth-1)+"px");
    //this corrects the source of the larger images
    //$(this).removeClass('invisible')
    let idOfForm = "#21"+$(this).attr("id")+"IMG";
    console.log(idOfForm);
    let imgPath = $(idOfForm).attr("sourceForJS");
    console.log(imgPath);
    $(idOfForm).attr("src",imgPath);
  });

  $('.size12022').each(function(index, element) {
    let theWidth = this.width;
    $(this).closest('.holdForNow').css("min-width",(theWidth-1)+"px");
    $(this).closest('.holdPhotoandBlack').css("min-width",(theWidth-1)+"px");
    //this corrects the source of the larger images
    //$(this).removeClass('invisible')
    let idOfForm = "#22"+$(this).attr("id")+"IMG";
    console.log(idOfForm);
    let imgPath = $(idOfForm).attr("sourceForJS");
    console.log(imgPath);
    $(idOfForm).attr("src",imgPath);
  });

  $('.invisible').each(function(index, element) {
    $(this).removeClass('invisible')
  });

  setTimeout(function() {
    $('.invisibleText').each(function(index, element) {
      $(this).removeClass('invisibleText')
    });
  }, 500);

  createAndShowSideBarLinks();

})

$( document ).ready(function() {

  document.getElementById('popUpImage').addEventListener('click', function(event) {
    let imgWidth = this.clientWidth;
    let xCoordinate = event.offsetX; // Get the x coordinate of the click

    if (xCoordinate < imgWidth / 2) {
        // Click on the left side
        changeImage(-1); // Go to the previous image
      } else {
        // Click on the right side
        changeImage(1); // Go to the next image
      }
    });

  document.addEventListener('keydown', function(event) {
    if (event.keyCode === 37) { // Left arrow key
        changeImage(-1); // Go to the previous image
    } else if (event.keyCode === 39) { // Right arrow key
        changeImage(1); // Go to the next image
    }
});


document.getElementById('popUpImage').addEventListener('touchstart', function(e) {
    isPinching = false;
    if (e.touches.length === 1) {
        this.style.transition = 'none';  // Disable transitions for immediate feedback
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        // Prepare for a pinch gesture
        isPinching = true;
    }
}, false);

document.getElementById('popUpImage').addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
        // Continue to handle pinch gesture
        isPinching = true;
    } else if (e.touches.length === 1 && !isPinching) {
        // Handle single finger swipe
        let currentX = e.touches[0].clientX;
        let currentY = e.touches[0].clientY;
        let deltaX = Math.round((currentX - startX) * 0.3);  // Reduced movement for more control
        let deltaY = currentY - startY;

        // Provide feedback by translating image based on finger movement
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            e.preventDefault();  // Prevent scrolling when moving horizontally
            this.style.transform = `translateX(${deltaX}px)`;
        }
    }
}, false);

document.getElementById('popUpImage').addEventListener('touchend', function(e) {
    this.style.transition = 'transform 0.3s ease';  // Re-enable transitions
    if (!isPinching && e.changedTouches.length === 1) {
        let endX = e.changedTouches[0].clientX;
        let endY = e.changedTouches[0].clientY;
        let deltaX = endX - startX;
        let deltaY = endY - startY;

        // Determine if the swipe was primarily vertical and downward
        if (Math.abs(deltaY) > window.innerHeight * 0.1 && deltaY > 0 && Math.abs(deltaX) < Math.abs(deltaY) / 2) {
            // Clear downward swipe, minimal horizontal movement
            $('#bigPicModal').modal('hide');  // Close the modal
        } else if (Math.abs(deltaX) > window.innerWidth * 0.1) {
            // Horizontal swipe exceeds threshold
            changeImage(deltaX > 0 ? -1 : 1);
        } else {
            // Swipe did not meet any criteria for action
            this.style.transform = '';  // Reset position
        }
    }
    isPinching = false;  // Reset pinch status
}, false);



  $('.modal').on('hidden.bs.modal', function ()
  {
    $('body').removeClass('no-scroll').css('top', '');
    $(window).scrollTop(scrollPosition);
    $('#modifyZIndex').removeClass('headerNoMove2')
    $('#modifyZIndex').addClass('headerNoMove')
    $('#whiteForTheTop').removeClass('headerNoMove3')
    $('#whiteForTheTop').addClass('whiteComeAndGo')
  })

  $('.modal').on('show.bs.modal', function ()
  {
    scrollPosition = $(window).scrollTop();
    $('body').addClass('no-scroll').css('top', -scrollPosition);
    $('#modifyZIndex').removeClass('headerNoMove')
    $('#modifyZIndex').addClass('headerNoMove2')
    $('#whiteForTheTop').removeClass('whiteComeAndGo')
    $('#whiteForTheTop').addClass('headerNoMove3')
  })


    var path = window.location.pathname;

    if (path === '/shop') {
        loadShop(); // Function to load the shop
    } else if (path === '/select-works') {
        getProjectsAndWorks(); // Function to load select works
    } else if (path === '/about') {
        openInfo(); // Function to load about
    }
    else 
    {
      getCarousel();
      
    }




  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
  {
    $('#popUpImage').removeClass('popUpImage')
    $('#popUpImage').addClass('popUpImageMobile')
    $('#imagesAndContent').removeClass('imagesAndContent')
    $('#imagesAndContent').addClass('imagesAndContentMobile')
    $('#blockForHeader').removeClass('blockForHeader')
    $('#blockForHeader').addClass('blockForHeaderMobile')
    $('#whiteForTheTopMaybe').addClass('headerNoMove3')
    $("#whiteForTheTopMaybe").attr('id', 'whiteForTheTop');
    $('#whiteForTheTop').addClass('headerNoMove3')
    $('#navLinksBox').removeClass('navLinksBox')
    $('#navLinksBox').addClass('navLinksBoxMobile')
    $('#homePageCarousel').removeClass('homePageCarousel')
    $('#homePageCarousel').addClass('homePageCarouselMobile')
    $('#selectProjectCategories').removeClass('hiddenLinkStuff')
    $('#selectProjectCategories').addClass('hiddenLinkStuffMobile')
    $('#ambName').removeClass('ambarNamePic')
    $('#ambName').addClass('ambarNamePicMobile')
    imageIsRows = ''
    projectIsRows = ''


    const allLinks = document.querySelectorAll('a');

    allLinks.forEach(link => {
      link.style.padding = '.05em';
      link.style.margin = '-.05em';
    });

    const genreLinks = document.querySelectorAll('a.mainLinkGenres');

    genreLinks.forEach(link => {
      link.style.padding = '.7em';
      link.style.margin = '-.7em';
    });

  }


});



function createAndShowSideBarLinks()
{
  return;
  // $.ajax({
  //   url: 'actions/sidebarAPI.php',
  //   method: 'GET',
  //   dataType: 'json',
  //   success: function(response) {
  //     orderSideBar(response);
  //   },
  //   error: function(xhr, status, error) {
  //     console.log('Error:', error);
  //   }
  // });
}

function orderSideBar(sideBarInformation)
{

}

function accessPictureForm(divName)
{
  let newDiveName = '#'+divName;
  $(newDiveName).modal('show');
  let pic1 = document.getElementById('leafTwist');
}

function test()
{
  $("#photoModal").modal('show');
}

function toggleSublinks(event, sublinksId)
{
  event.preventDefault();
  var sublinks = $("#" + sublinksId);
  //$(".hiddenLinkStuff").not(sublinks).slideUp();
  sublinks.slideToggle();
  $("#breaksForTitles").slideToggle();
}

function getWorksInformation(genre) 
{
  //pageNumber = genre;
  genre = {
    theYear: genre
  }

  $.ajax({
    url: 'actions/picturesAPI.php',
    method: 'GET',
    data: genre,
    dataType: 'json',
    success: function(response) {
      console.log(response);
      insertWorks(response);
    },
    error: function(xhr, status, error) {
      console.log('Error:', error);
    }
  });

}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getProjectsAndWorks(partOfThePage)
{
  $('#imagesAndContent').css('padding-top', '50px');

  if (selectWorksAreShown)
  {
    return;
  }

  $.ajax({
    url: "../actions/projectsAPI.php",
    type: "GET",
    data: {'activity' : 'active'},
    dataType: "json",
    success: function(data) {
      makeProjectCards(data, partOfThePage);

    },
    error: function() {
      console.log("An error occurred.");
    },
  });

  //jumpToSection(partOfThePage);

  selectWorksAreShown = true;
}

function jumpToSection(partOfThePage) {
    if (partOfThePage != null) {
        console.log('Part of the page:', partOfThePage);

        var element = document.getElementById(partOfThePage);
        console.log('Element:', element);

        if (element) {
            element.scrollIntoView();
        } else {
            console.error(`Element with ID '${partOfThePage}' not found.`);
        }
    }
}

function fetchWorkIdsForProject(id) {

  return $.ajax({
    url: '../actions/worksOfProjectsAPI.php',
    type: 'GET',
    data: { 'projectId': id },
    dataType: 'json'
  });
}

function getWorkFromId(id) {

  return $.ajax({
    url: '../actions/worksOfProjectsAPI.php',
    type: 'GET',
    data: { 'projectId': id },
    dataType: 'json'
  });
}

function makeProjectCards(projects, partOfThePage) {
  $('#imagesAndContent').empty();
  images.length = 0;

  let projectPromises = projects.map(project => {
    return fetchWorkIdsForProject(project.id).then(workIds => {
      return getWorksInfoFromIdsArray(workIds).then(allWorksForProject => {
                return { project, allWorksForProject }; // Return project info with its works
              });
    });
  });

  Promise.all(projectPromises).then(results => {
    results.forEach(({ project, allWorksForProject }) => {
      let mainProj = createProjectElement(project);
      allWorksForProject.forEach(information => {
        let card = createWorkCardElement(information);
        mainProj.find('.projectWorks').first().append(card);
      });
      if (projects[projects.length - 1].title != project.title)
      {
        mainProj.append('<div class="work-separator" id="seperator'+project.title+'"> 𓏲 ๋࣭ ࣪ ˖·ﾟ ·ﾟ·:。·ﾟﾟ·✮ ⋆ ˚。𖦹 ⋆。°✩·ﾟ ·ﾟ·:。·ﾟﾟ·°˖𓇢</div>');
      }
      $('#imagesAndContent').append(mainProj);
      console.log(projects, project.title)
    });
    jumpToSection(partOfThePage);
      //below is where the code to initialize the little window for the youtube video
      //openFlowerVideo();
              history.pushState({page: 'select-works'}, 'Select Works', '/select-works');
  document.title = 'Select Works - Ambar Velasco';
  }).catch(error => {
    console.error('Error:', error);
  });
}


  function openFlowerVideo()
  {
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
    {
      let flowerDivider = document.getElementById('seperatorIn Conversation with a Flower');
      let videoLink = 
      `
      <br><br>
      <iframe width="100%" src="https://www.youtube.com/embed/P5z_o8lBbGE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      `;

      flowerDivider.insertAdjacentHTML('beforebegin', videoLink);

    }
    else
    {
      let flowerDivider = document.getElementById('seperatorIn Conversation with a Flower');
      let videoLink = 
      `
      <br>
      <iframe width="750" height="375" src="https://www.youtube.com/embed/P5z_o8lBbGE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      `;
      flowerDivider.insertAdjacentHTML('beforebegin', videoLink);

    }
  }


function createProjectElement(project) {
  let worksOfProjectDiv = $('<div>').addClass('projectWorks ' + projectIsRows);
  let titleAndDescriptionDiv = $('<div>')
  let title = project.title;
  let description = project.description.replace(/\n/g, '<br>');
  let insertTitle = $('<h2>').text(title).css('margin-bottom', '30px');
  let insertDescription = $('<p>').html(description).css({
    'color': '#71797E', // Dark grey color
    'margin-bottom': '40px' // Margin bottom
  });
  //decomment below if you want to redisplay the title and description of projects
  //titleAndDescriptionDiv.append(insertTitle, insertDescription);
  let projectDiv = $('<div>').addClass('project').attr({
    'alt': title,
    'id': 'projectSection'+title.trim()
  }).css({'border': '0px', 'text-align': 'center'});
  projectDiv.append(titleAndDescriptionDiv).append(worksOfProjectDiv)
  return projectDiv;
}

function createWorkCardElement(information) {
  let imageURL = "baseImages/" + information.location;
  let thumbnailURL = "thumbnails/" + information.location;
  let title = information.name;
  let description = information.firstDescription.replace(/\n/g, '<br>');

  let imageInfo = {
    url: imageURL,
    title: title,
    description: description
  };
  //decomment below for name and description to show below the painting
  // let insertTitle = $('<p>').html('<b><i>' + title + '</i></b>');
  // let insertDescription = $('<p>').html(description);
  let insertTitle = '';
  let insertDescription = '';
  let imageContainer = $('<div>').addClass('img-container ' + imageIsRows).append($('<img>').attr('src', thumbnailURL).attr('alt', 'Image of ' + title).attr('Title', title).attr('Description', description));
  let card = $('<div>').addClass('card').attr('alt', title).css({'border': '0px', 'text-align': 'center'}).append(imageContainer, insertTitle, insertDescription);
  card.click(() => makeBigPic(imageURL));
  images.push(imageInfo);
  return card;
}


function getWorksInfoFromIdsArray(projectIds) 
{
  return $.ajax({
    url: '../actions/getWorksByIdArray.php',
    method: 'GET',
    data: {'projectIds' : projectIds},
    dataType: 'json',

  });
}

function getCarousel()
{
  genre = {
    theYear: 'carousel'
  }

  $.ajax({
    url: 'actions/picturesAPI.php',
    method: 'GET',
    data: genre,
    dataType: 'json',
    success: function(response) {
      createCarousel(response);
    },
    error: function(xhr, status, error) {
      console.log('Error:', error);
    }
  });
}

function createCarousel(informations)
{
  images.length = 0;
  carouselHtml = `<div id="homePageCarousel" class="carousel slide homePageCarousel" data-ride="carousel">
  <div class="carousel-inner" id="insertImagesHere" class="insertImagesHere">`;
  active = 'active';

  informations.forEach(function(information){
    let imageURL = "baseImages/" + information.location;
    let thumbnailURL = "thumbnails/" + information.location;
    let title = information.name;
    let description = information.firstDescription.replace(/\n/g, '<br>');
  
    let imageInfo = {
      url: imageURL,
      title: title,
      description: description
    };

    let thisImage = `<div id="`+information.name+`" class="carousel-item `+active+` " >
    <img class="d-block carousel-pic" src="`+thumbnailURL+`" onclick="makeBigPic('`+imageURL+`')">
    </div>`;
    carouselHtml += thisImage;
    active = '';
    images.push(imageInfo);
  });

  carouselHtml += `<a class="carousel-control-prev" href="#homePageCarousel" role="button" data-slide="prev">
  <span class="sr-only">Previous</span>
  </a>
  <a class="carousel-control-next" href="#homePageCarousel" role="button" data-slide="next">
  <span class="sr-only">Next</span>
  </a>
  </div>`

  document.getElementById('imagesAndContent').innerHTML = carouselHtml;

  //$('#homePageCarousel').carousel();

  $('#homePageCarousel').carousel({
    interval: 3000
  })

  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
  {
    $('#homePageCarousel').removeClass('homePageCarousel')
    $('#homePageCarousel').addClass('homePageCarouselMobile')
  }

}

function insertWorks(informations) {
  $('#imagesAndContent').empty();

  informations.forEach(function(information, index) { // 'array' removed
    let imageURL = "baseImages/" + information.location;
    let title = information.name;
    let description = information.firstDescription;

    let card = $('<div>').addClass('card').attr('alt', title).css({'border': '0px', 'text-align': 'center'});

    let imageContainer = $('<div>').addClass('img-container');
    let image = $('<img>').attr('src', imageURL).attr('alt', 'Image of ' + title);
    image.appendTo(imageContainer);

    let insertTitle = $('<p>').text(title);
    let formattedDescription = description.replace(/\n/g, '<br>');
    let insertDescription = $('<p>').html(formattedDescription);
    
    card.append(imageContainer, insertTitle, insertDescription);

    // Check if this is not the last element in the array
    if (index < informations.length - 1) {
      card.append('<hr class="work-separator" />'); // Append the separator
    }

    card.click(function() {
      makeBigPic(imageURL);
    });

    $('#imagesAndContent').append(card);
  });
}

// function makeBigPic(imageURL) 
// {
//     currentIndex = images.indexOf(imageURL);
//     updateLightboxImage();
//     document.getElementById('lightbox').style.display = 'block';
// }

function makeBigPic(clickedImageUrl)
{
  const spinner = document.getElementById('spinner');
  spinner.style.display = 'block';
  
  let currentImageIndex = images.findIndex(image => image.url === clickedImageUrl);
  let currentImage = images[currentImageIndex];
  const imgElement = document.getElementById('popUpImage');


  imgElement.src = '';

  // Set the new image source
  imgElement.src = currentImage.url;

  // Wait for the image to load
  imgElement.onload = function() {
      // Hide the loading spinner
      spinner.style.display = 'none';

      // Update the text once the image has loaded
      document.getElementById('imageTitle').textContent = currentImage.title;
      document.getElementById('imageDescription').innerHTML = currentImage.description;
  };

  // const imageContainer = document.querySelector('.imageInfo');
  // if (imageContainer) {
  //     imageContainer.style.width = `${document.getElementById('popUpImage').clientWidth}px`;
  // }
  $('#bigPicModal').modal('show');

}



function changeImage(step) {
    currentImageIndex += step;
    if (currentImageIndex >= images.length) {
        currentImageIndex = 0;
    } else if (currentImageIndex < 0) {
        currentImageIndex = images.length - 1;
    }

    const imgElement = document.getElementById('popUpImage');
    const spinner = document.getElementById('spinner');
    document.getElementById('imageTitle').innerHTML = '';
    document.getElementById('imageDescription').innerHTML = '';

    // Show the loading spinner
    spinner.style.display = 'block';

    // Clear previous image and text
    imgElement.style.transform = '';
    imgElement.src = '';  // Clear the source to trigger loading state

    // Set the new image source
    const newImageSrc = images[currentImageIndex].url;
    imgElement.src = newImageSrc;

    // Wait for the image to load
    imgElement.onload = function() {
        // Hide the loading spinner
        spinner.style.display = 'none';

        // Update the text once the image has loaded
        document.getElementById('imageTitle').innerHTML = images[currentImageIndex].title;
        document.getElementById('imageDescription').innerHTML = images[currentImageIndex].description;
    };
}


  function getDistanceBetweenTouches(touches) 
  {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}





  function openModalWithImage(imageIndex) {

    currentImageIndex = imageIndex;
    document.getElementById('popUpImage').src = images[imageIndex];
    $('#bigPicModal').modal('show');
  }

  function fetchCurrentAboutMe() {
  return $.ajax({
    url: '../actions/aboutMeAPI.php', // Replace with the correct path to your PHP script
    type: 'GET',
    dataType: 'json',
  });
}

  async function openInfo()
  {
    $('#imagesAndContent').css('padding-top', '50px');
   const aboutMe = await fetchCurrentAboutMe();
   let description = aboutMe.description.replace(/\n/g, "<br>");;
    
    let infoflex = 'infoflex';
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
    {
      infoflex = 'infoflexMobile';

      document.getElementById('imagesAndContent').innerHTML = `
      <div class="`+infoflex+`">

      <img src="baseImages/bubbers.jpg" id="ambarPersoPic" alt="ambarPersoPic" style="max-width:80%;">

      <div class="iconsRow" style="width:100%">
           </div>
      <p style="">
      `+description+`
      </p>
      <br>
      </div>
      `;

    }
    else if (window.matchMedia('(max-width: 1450px)').matches) {
      infoflex = 'infoflexMobile';

      document.getElementById('imagesAndContent').innerHTML = `
      <div class="`+infoflex+`">

      <div class="size2">
      <div class="ambPicDiv" style="display:flex; align-items:center; justify-content:center;">
      <img src="baseImages/bubbers.jpg" id="ambarPersoPic" alt="ambarPersoPic" style="display: block; max-height:55vh; margin-top:7vh">
      </div>
      </div>
      <div class="iconsRow" style="width:100%">
           </div>
      <p style="">
      `+description+`
      </p>
      <br>
      </div>
      `;
    }
    else
    {
      document.getElementById('imagesAndContent').innerHTML = `
      <div class="`+infoflex+`">
      <div class="size1" id="aboutMeInfo">
      <br>
      <p>
      `+description+`
      </p>
      </div>

      <div class="size2">
      <div class="ambPicDiv" style="display:flex; align-items:center; justify-content:center;">
      <img src="baseImages/bubbers.jpg" id="ambarPersoPic" alt="ambarPersoPic" style="display: block; max-width:28vw; margin-left: -5vw; margin-top:4vh">
      </div>
      <div class="iconsRow">
      <!-- <p>ornament here</p> -->
      </div>
      <div class="iconsRow" style="padding-right:30px;">
            </div>

      </div>

      </div>
      `;
    }
       history.pushState({ page: 'about' }, 'About - Ambar Velasco', '/about');
    document.title = 'About - Ambar Velasco'; // Optionally, update the document title
  }
