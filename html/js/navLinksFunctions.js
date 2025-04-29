document.addEventListener('DOMContentLoaded', function() {
    loadAndInsertNavBarLinks();
});

// You could even make it more aggressive by executing immediately
// This will run as soon as the script is loaded
(function() {
    // Check if document is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAndInsertNavBarLinks);
    } else {
        // Document already loaded, execute immediately
        loadAndInsertNavBarLinks();
    }
})();

function loadAndInsertNavBarLinks() {
    $.ajax({
        url: '../actions/navLinksAPI.php',
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            if (response.status === 'success') {
                insertLinks(response.data);
                loadAndDisplayProjectTitles();

                // Set up event listeners for newsletter form
                $(document).on('click', '#newsletterSubmit', function() {
                    sendEmailToDB();
                });

                $(document).on('keypress', '#newsletterEmail', function(event) {
                    if (event.which === 13) { // Enter key
                        sendEmailToDB();
                    }
                });
            } else {
                console.log("error with loading links")
            }
        }
    });
}

function insertLinks(links) {
    $('#navLinksBox').empty();
    links.forEach(function (link) {
        let id = link.ID;
        let displayedText = link.displayedText;
        let linkRedirection = link.linkRedirection;
        let onclick = link['onclick'];
        let isNewTab = link.isNewTab;
        let attachedFollowingDiv = link.attachedFollowingDiv;

        createNewNavLinkRow(displayedText, linkRedirection, onclick, isNewTab, attachedFollowingDiv);
    });

    // After creating all links, check if the newsletter div exists and add the form
    if ($('#newsletterSignUp').length > 0) {
        $('#newsletterSignUp').html(`
        <div class="newsletter-container">
            <input type="email" id="newsletterEmail" placeholder="Enter your email address" class="newsletter-input">
            <div class="button-container">
                <button id="newsletterSubmit" class="newsletter-button">Subscribe</button>
            </div>
        </div>
    `);
    }
}

function createNewNavLinkRow(displayedText, linkRedirection, instructionString, isNewTab, attachedFollowingDiv) {
    // Create a new anchor element
    const listItem = $('<a></a>');
    // Set the attributes
    listItem.attr({
        href: linkRedirection,
        class: 'mainLinkGenres'
    });

    // Set the displayed text
    listItem.text(displayedText);

    // If the link should open in a new tab
    if (isNewTab == 1) {
        listItem.attr('target', '_blank');
    }

    listItem.on('click', function(event) {
        const instructions = instructionString.split(';').map(instr => instr.trim());

        instructions.forEach(instruction => {
            if (functionMappings[instruction]) {
                functionMappings[instruction](event);
            } else if (specialMappings[instruction]) {
                specialMappings[instruction]();
            }
        });
    });

    // Append the new link to the navigation links box
    $('#navLinksBox').append(listItem);


    if (attachedFollowingDiv)
    {
        attachedFollowingDiv = JSON.parse(attachedFollowingDiv)
        const additionalContent = $('<div></div>').attr({
            id: attachedFollowingDiv.id,
            class: attachedFollowingDiv.class
        });

        $('#navLinksBox').append(additionalContent);
        $('#navLinksBox').append(`<div id="breaksForTitles"><br></div>`);

        return;
    }

    $('#navLinksBox').append('<br><br>');

}

const functionMappings = {
    "getProjectsAndWorks": function(param) {
        getProjectsAndWorks(param);
    },
    "toggleSublinks": function(event) {
        toggleSublinks(event, 'selectProjectCategories');
    },
    "toggleNewsLetterSignUp": function(event) {
        toggleNewsLetterSignUp(event);
    },
    "loadShop": loadShop,
    "openInfo": openInfo
};


const specialMappings = {
    "selectWorksAreShown": function() {
        window.selectWorksAreShown = true;
    },
    "selectWorksAreNotShown": function() {
        window.selectWorksAreShown = false;
    }
};

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
                    .attr('href', '#projectSection'+project.title.trim())
                    .text(title);
                link.click(() => getProjectsAndWorks('projectSection'+project.title.trim()));
                container.append(link, '<br><br>'); // Append link and a line break for spacing
            });
        },
        error: function() {
            console.log('Error loading project titles.');
        }
    });
}

// Newsletter functions

function toggleNewsLetterSignUp(event) {
    event.preventDefault();
    var newsletterForm = $("#newsletterSignUp");
    newsletterForm.slideToggle(function() {
        // Check if the form is visible after toggling
        if (newsletterForm.is(":visible")) {
            // Set focus on the email input field
            $("#newsletterEmail").focus();
        }
    });
}

function sendEmailToDB() {
    const email = $("#newsletterEmail").val();
    if (validateEmail(email)) {
        // Make API call to save the email
        $.ajax({
            url: '../actions/newsletterAPI.php',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email }),
            success: function(response) {
                if (response.status === 'success') {
                    // Clear the input field after submission
                    $("#newsletterEmail").val("");
                    // Show a thank you message
                    alert("Thank you for subscribing!");
                    // Hide the form after successful submission
                    $("#newsletterSignUp").slideUp();
                } else {
                    alert("Error: " + response.message);
                }
            },
            error: function(xhr, status, error) {
                console.error("Error sending email:", error);
                alert("An error occurred. Please try again later.");
            }
        });
    } else {
        alert("Please enter a valid email address");
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function toggleSublinks(event, sublinksId)
{
    console.log("toggle")
    event.preventDefault();
    var sublinks = $("#" + sublinksId);
    //$(".hiddenLinkStuff").not(sublinks).slideUp();
    sublinks.slideToggle();
    $("#breaksForTitles").slideToggle();
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

    selectWorksAreShown = true;
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

function jumpToSection(partOfThePage)
{
    if (partOfThePage !== null)
    {
        //sleep(300).then(() => {
        var element = document.getElementById(''+partOfThePage);
        element.scrollIntoView();
        // });
    }
}

function loadShop()
{
    yearData = { activity: 'active' }
    $.ajax({
        url: "../actions/shopAPI.php",
        type: "GET",
        data: yearData,
        dataType: "json",
        success: function(data) {
            $('#imagesAndContent').empty();
            $('#imagesAndContent').css('padding-top', '50px');
            //$('#imagesAndContent').css('padding-top', '7vh');
            $('<div>', {
                class: 'shop-top-space',
                css: {
                    height: '20px' // Adjust the value as needed
                }
            }).prependTo('#imagesAndContent');
            //$('#imagesAndContent').append("<p>this is a test<p>");

            data.forEach(function(item) {
                // Create the shopItem and append to the imagesAndContent container
                $('#imagesAndContent').append(createShopItem(item));
            });

            history.pushState({page: 'shop'}, 'Shop', '/shop');
            document.title = 'Shop - Ambar Velasco';
        },
        error: function() {
            console.log("An error occurred.");
        },
    });
}

// Fetch current About Me content for the front-end
async function fetchCurrentAboutMe() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'actions/aboutMeAPI.php', // Correctly using aboutMeAPI.php
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                resolve(data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('Error fetching about me:', textStatus, errorThrown);
                reject(errorThrown);
            }
        });
    });
}

// Open About Me section
async function openInfo() {
    try {
        $('#imagesAndContent').css('padding-top', '50px');
        const aboutMe = await fetchCurrentAboutMe();

        if (!aboutMe) {
            console.error('Failed to fetch About Me data');
            return;
        }

        let description = aboutMe.description.replace(/\n/g, "<br>");

        // Determine the image path - use the dynamic path if available or fallback to default
        let imagePath = 'baseImages/bubbers.jpg'; // fallback default image

        if (aboutMe.pictureLocation && aboutMe.pictureLocation !== 'unavailable') {
            imagePath = aboutMe.pictureLocation;
        }

        // Determine layout based on device
        let infoflex = 'infoflex';

        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            infoflex = 'infoflexMobile';

            document.getElementById('imagesAndContent').innerHTML = `
        <div class="${infoflex}">
          <img src="${imagePath}" id="ambarPersoPic" alt="ambarPersoPic" style="max-width:80%;">
          <div class="iconsRow" style="width:100%"></div>
          <p style="">${description}</p>
          <br>
        </div>
      `;
        }
        else if (window.matchMedia('(max-width: 1450px)').matches) {
            infoflex = 'infoflexMobile';

            document.getElementById('imagesAndContent').innerHTML = `
        <div class="${infoflex}">
          <div class="size2">
            <div class="ambPicDiv" style="display:flex; align-items:center; justify-content:center;">
              <img src="${imagePath}" id="ambarPersoPic" alt="ambarPersoPic" style="display: block; max-height:55vh; margin-top:7vh">
            </div>
          </div>
          <div class="iconsRow" style="width:100%"></div>
          <p style="">${description}</p>
          <br>
        </div>
      `;
        }
        else {
            document.getElementById('imagesAndContent').innerHTML = `
        <div class="${infoflex}">
          <div class="size1" id="aboutMeInfo">
            <br>
            <p>${description}</p>
          </div>
          <div class="size2">
            <div class="ambPicDiv" style="display:flex; align-items:center; justify-content:center;">
              <img src="${imagePath}" id="ambarPersoPic" alt="ambarPersoPic" style="display: block; max-width:28vw; margin-left: -5vw; margin-top:4vh">
            </div>
            <div class="iconsRow">
              <!-- <p>ornament here</p> -->
            </div>
            <div class="iconsRow" style="padding-right:30px;"></div>
          </div>
        </div>
      `;
        }

        history.pushState({ page: 'about' }, 'About - Ambar Velasco', '/about');
        document.title = 'About - Ambar Velasco'; // Update the document title
    } catch (error) {
        console.error('Error in openInfo:', error);
        // Show fallback content in case of error
        document.getElementById('imagesAndContent').innerHTML = `
      <div class="infoflex">
        <p>Sorry, we couldn't load the About Me information. Please try again later.</p>
      </div>
    `;
    }
}