var selectWorksAreShown = false;
let currentImageIndex = 0; // Global variable to track the current image index
let images = []; // Global array to store image URLs
let startX, startY, initialTouchDistance, currentX;
let isPinching = false;

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


document.getElementById('popUpImage').addEventListener('touchstart', function(e) {
  isPinching = false;
    if (e.touches.length === 1) {
      this.style.transition = 'none';
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isPinching = false; // Single touch, so not pinching
    } else if (e.touches.length === 2) {
        // Two fingers - potential pinch
        isPinching = true;
    }
}, false);

document.getElementById('popUpImage').addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
        // Two fingers moving - continue to treat as a pinch
        isPinching = true;
    } else if (e.touches.length === 1 && !isPinching) {
        // Single finger swipe action
        let currentX = e.touches[0].clientX;
        let currentY = e.touches[0].clientY;

        // Calculate the distance moved
        let deltaX = Math.round((currentX - startX)*.3);
        let deltaY = currentY - startY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // More horizontal movement than vertical
            e.preventDefault(); // Prevent scrolling
            // Apply the movement for visual feedback
            this.style.transform = `translateX(${deltaX}px)`;
        }
    }
}, false);

document.getElementById('popUpImage').addEventListener('touchend', function(e) {
  this.style.transition = 'transform 0.3s ease';
    if (!isPinching && e.changedTouches.length === 1) {
        let endX = e.changedTouches[0].clientX;
        let deltaX = endX - startX;

        if (Math.abs(deltaX) > window.innerWidth * 0.1) {
            // Threshold for swipe action
            changeImage(deltaX > 0 ? -1 : 1);
        } else {
            // Not enough swipe, return to original position
            this.style.transform = '';
        }
    }
     // Reset pinch status on touch end
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
      loadAndDisplayProjectTitles();
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

function loadAndDisplayProjectTitles() {
  $.ajax({
        url: '../actions/projectsAPI.php', // URL to the PHP script that fetches project titles
        type: 'GET',
        dataType: 'json',
        success: function(projects) {
          let container = $('#selectProjectCategories');
            container.empty(); // Clear existing content
            container.append('<br>')
            projects.forEach(function(project) {
                let title = project.title; // Assuming each project has a 'title' property
                let link = $('<a>')
                .attr('href', '#projectSection'+project.title)
                .text(title);
                link.click(() => getProjectsAndWorks('projectSection'+project.title.trim()));        
                container.append(link, '<br><br>'); // Append link and a line break for spacing
              });
            //container.append('<br>')
          },
          error: function() {
            console.log('Error loading project titles.');
          }
        });
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

function jumpToSection(partOfThePage)
{
    if (partOfThePage != null)
  {
    //sleep(300).then(() => { 
    console.log(partOfThePage)
    var element = document.getElementById(''+partOfThePage);
    console.log(element);
    element.scrollIntoView();
    // });
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
  console.log(projects);
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
        mainProj.append(card);
      });
      mainProj.append('<hr class="work-separator" id="seperator'+project.title+'"/>');
      $('#imagesAndContent').append(mainProj);
    });
    jumpToSection(partOfThePage);
      openFlowerVideo();
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
  let title = project.title;
  let description = project.description.replace(/\n/g, '<br>');
  let insertTitle = $('<h2>').text(title).css('margin-bottom', '30px');
  let insertDescription = $('<p>').html(description).css({
    'color': '#71797E', // Dark grey color
    'margin-bottom': '40px' // Margin bottom
  });  
  return $('<div>').addClass('project').attr({
    'alt': title,
    'id': 'projectSection'+title.trim()
  }).css({'border': '0px', 'text-align': 'center'}).append(insertTitle, insertDescription);
}

function createWorkCardElement(information) {
  let imageURL = "baseImages/" + information.location;
  let title = information.name;
  let description = information.firstDescription.replace(/\n/g, '<br>');
  let insertTitle = $('<p>').html('<b><i>' + title + '</i></b>');
  let insertDescription = $('<p>').html(description);
  let imageContainer = $('<div>').addClass('img-container').append($('<img>').attr('src', imageURL).attr('alt', 'Image of ' + title));
  let card = $('<div>').addClass('card').attr('alt', title).css({'border': '0px', 'text-align': 'center'}).append(imageContainer, insertTitle, insertDescription);
  card.click(() => makeBigPic(imageURL));
  images.push(imageURL);
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
    let imageURL = "baseImages/"+information.location;
    let thisImage = `<div id="`+information.name+`" class="carousel-item `+active+` " >
    <img class="d-block carousel-pic" src="`+imageURL+`" onclick="makeBigPic('`+imageURL+`')">
    </div>`;
    carouselHtml += thisImage;
    active = '';
    images.push(imageURL);
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
  currentImageIndex = images.indexOf(clickedImageUrl);
  document.getElementById('popUpImage').src = images[currentImageIndex];
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
    imgElement.style.transform = ''; // Reset transform for new image
    imgElement.src = images[currentImageIndex];
  }

  function getDistanceBetweenTouches(touches) {
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

      <img src="baseImages/bubbers.jpg" id="ambarPersoPic" alt="ambarPersoPic" style="max-width:100%;">

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
      <img src="baseImages/bubbers.jpg" id="ambarPersoPic" alt="ambarPersoPic" style="display: block; min-height:441px; min-width:435px; max-height:441px; max-width:435px; margin-left: -5vw; margin-top:4vh">
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
