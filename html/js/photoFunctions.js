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

  // var scrollPosition = 0;
  // const scrollDemo = document.querySelector("#photoHolder");
  //
  //
  // $( "#scrollRight" ).click(function() {
  //   scrollPosition = scrollDemo.scrollLeft + 1000;
  //   $("#photoHolder").scrollLeft(scrollPosition);
  // });
  //
  // $( "#scrollLeft" ).click(function() {
  //
  //   scrollPosition = scrollDemo.scrollLeft - 1000;
  //   $("#photoHolder").scrollLeft(scrollPosition);
  // });

  $('.modal').on('hidden.bs.modal', function ()
  {
  $('#modifyZIndex').removeClass('headerNoMove2')
  $('#modifyZIndex').addClass('headerNoMove')
  $('#whiteForTheTop').removeClass('headerNoMove3')
  $('#whiteForTheTop').addClass('whiteComeAndGo')
  })

  $('.modal').on('show.bs.modal', function ()
  {
  $('#modifyZIndex').removeClass('headerNoMove')
  $('#modifyZIndex').addClass('headerNoMove2')
  $('#whiteForTheTop').removeClass('whiteComeAndGo')
  $('#whiteForTheTop').addClass('headerNoMove3')
  })

  getCarousel();


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

  //
  // $( ".size12020" ).click(function() {
  //   let theWidth = this.width;
  //   console.log(theWidth);
  //   //$('#ambName').width(1000);
  //   $(this).closest('.holdForNow').css("min-width",theWidth+"px");
  // });

  // function makeBigPic(path)
  // {
  //   $('#bigPicModal').modal('show');
  //   document.getElementById('popUpImage').src = path;
  //
  //   // this.classList.remove("size12020");
  // }

});

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
  $(".hiddenLinkStuff").not(sublinks).slideUp();
  sublinks.slideToggle();
}

function getWorksInformation(genre) {

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

function makeBigPic(path)
{
  $('#bigPicModal').modal('show');
  document.getElementById('popUpImage').src = path;

  // this.classList.remove("size12020");
}

function openInfo()
{
  let infoflex = 'infoflex';
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
  {
    infoflex = 'infoflexMobile';

    document.getElementById('imagesAndContent').innerHTML = `

      <img src="imgMid/bioPic.jpeg" id="ambarPersoPic" alt="ambarPersoPic" style="max-width:400px;">

      <br>
      <br>
    <div class="iconsRow" style="width:100%">
      <a href="https://www.instagram.com/ambar_velasc0/" target="_blank"><img src="img/instaIcon.png"  class = "iconImages" target="_blank"> </a>
      <!-- <a href="contact.html"><img src="img/emailIcon.png" style="height:20px; width:30px; margin-right : 1.5vw;"></a> -->
      <a href="https://www.etsy.com/shop/ARTBYAMBAR?ref=seller-platform-mcnav"><img src="img/shopIconShine.png" style="height:60px; width:60px;" target="_blank"></a>
    </div>
    <p>
      My name is Ambar Velasco. I am a Mexican-American artist. I was born and raised in Los Angeles, California and I'm currently in my final year of plastic art studies at Paris 1 Panthéon-Sorbonne in Paris, France. I mostly work with acrylic paint and graphite. I also enjoy photography, film, and collaging with fresh leaves.
    </p>
    <p>
      I have always used painting and drawing as a site of reflection. Throughout the creation process, I discover and rediscover parts of myself. The force and whimsy of personal evolution is very intriguing to me. It involves confronting our inner worlds, recognising the desires and needs that live there. I also look outward, at my surroundings, for signs of evolution-in the people, their clothes, the buildings, the trees. It is the experience of balancing and questioning these inner and outer worlds to create one identity that I am attempting to express.
    </p>
    <p>
      I hope to connect with others and to bring a moment of delight and inspire reflection to those who view my works.
    </p>
    <br>

    <br><br>
    `;

  }
  else
  {
    document.getElementById('imagesAndContent').innerHTML = `
        <div class="`+infoflex+`">
          <div class="size1">
            <h2>About Me</h2>
            <br>
            <p>
              My name is Ambar Velasco. I am a Mexican-American artist. I was born and raised in Los Angeles, California and I'm currently in my final year of plastic art studies at Paris 1 Panthéon-Sorbonne in Paris, France. I mostly work with acrylic paint and graphite. I also enjoy photography, film, and collaging with fresh leaves.
            </p>
            <p>
              I have always used painting and drawing as a site of reflection. Throughout the creation process, I discover and rediscover parts of myself. The force and whimsy of personal evolution is very intriguing to me. It involves confronting our inner worlds, recognising the desires and needs that live there. I also look outward, at my surroundings, for signs of evolution-in the people, their clothes, the buildings, the trees. It is the experience of balancing and questioning these inner and outer worlds to create one identity that I am attempting to express.
            </p>
            <p>
              I hope to connect with others and to bring a moment of delight and inspire reflection to those who view my works.
            </p>
            <br>

            <br><br>
            </div>

            <div class="size2">
              <div class="ambPicDiv" style="display:flex; align-items:center; justify-content:center;">
                <img src="imgMid/bioPic.jpeg" id="ambarPersoPic" alt="ambarPersoPic" style="display: block; min-height:435px; min-width:291px; max-height:435px; max-width:291px; margin-left: -5vw; margin-top:4vh">
              </div>
              <div class="iconsRow">
                <!-- <p>ornament here</p> -->
              </div>
              <div class="iconsRow" style="padding-right:30px;">
                <a href="https://www.instagram.com/ambar_velasc0/" target="_blank"><img src="img/instaIcon.png"  class = "iconImages" target="_blank"> </a>
                <!-- <a href="contact.html"><img src="img/emailIcon.png" style="height:20px; width:30px; margin-right : 1.5vw;"></a> -->
                <a href="https://www.etsy.com/shop/ARTBYAMBAR?ref=seller-platform-mcnav"><img src="img/shopIconShine.png" style="height:60px; width:60px;" target="_blank"></a>
              </div>

            </div>

          </div>
    `;
  }
}

function openFlowerVideo()
{
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) )
  {
    document.getElementById('imagesAndContent').innerHTML = `
      <iframe width="1000" height="500" src="https://www.youtube.com/embed/P5z_o8lBbGE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    `;
  }
  else
  {
    document.getElementById('imagesAndContent').innerHTML = `
    <br><br><br>
      <br>
      <iframe width="1000" height="500" src="https://www.youtube.com/embed/P5z_o8lBbGE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    `;
  }
}
