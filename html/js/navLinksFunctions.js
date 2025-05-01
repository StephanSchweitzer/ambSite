document.addEventListener('DOMContentLoaded', function() {
    loadAndInsertNavBarLinks();
});

// Execute immediately if document is already loaded
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAndInsertNavBarLinks);
    } else {
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
                console.log("Error with loading links");
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

// Update this function in navLinksFunctions.js
function createNewNavLinkRow(displayedText, linkRedirection, instructionString, isNewTab, attachedFollowingDiv) {
    // Create a container div for the link to maintain proper spacing
    const linkContainer = $('<div>').addClass('nav-link-container');

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
        if (instructionString) {
            const instructions = instructionString.split(';').map(instr => instr.trim());

            instructions.forEach(instruction => {
                if (functionMappings[instruction]) {
                    functionMappings[instruction](event);
                } else if (specialMappings[instruction]) {
                    specialMappings[instruction]();
                }
            });
        }
    });

    // Add the link to the container
    linkContainer.append(listItem);

    // Append the container to the nav box
    $('#navLinksBox').append(linkContainer);

    if (attachedFollowingDiv) {
        try {
            attachedFollowingDiv = JSON.parse(attachedFollowingDiv);
            const additionalContent = $('<div></div>').attr({
                id: attachedFollowingDiv.id,
                class: attachedFollowingDiv.class
            });

            $('#navLinksBox').append(additionalContent);
            $('#navLinksBox').append(`<div id="breaksForTitles"><br></div>`);
            return;
        } catch (e) {
            console.error("Error parsing attachedFollowingDiv:", e);
        }
    }
}

const functionMappings = {
    "getProjectsAndWorks": function(event) {
        getProjectsAndWorks();
    },
    "toggleSublinks": function(event) {
        toggleSublinks(event, 'selectProjectCategories');
    },
    "toggleNewsLetterSignUp": function(event) {
        toggleNewsLetterSignUp(event);
    },
    "loadShop": loadShop,
    "openInfo": openInfo,
    "openCurrentProject": openCurrentProject
};

const specialMappings = {
    "selectWorksAreShown": function() {
        window.selectWorksAreShown = true;
    },
    "selectWorksAreNotShown": function() {
        window.selectWorksAreShown = false;
    }
};

// In navLinksFunctions.js - update loadAndDisplayProjectTitles function
function loadAndDisplayProjectTitles() {
    $.ajax({
        url: '../actions/projectsAPI.php',
        type: 'GET',
        dataType: 'json',
        success: function(projects) {
            let container = $('#selectProjectCategories');
            container.empty();
            container.append('<br>');
            projects.forEach(function(project) {
                let title = project.title;
                let sectionId = 'projectSection' + project.title.trim();
                let link = $('<a>')
                    .attr('href', '#' + sectionId)
                    .text(title);

                // Modified click handler that keeps dropdown open
                link.on('click', function(e) {
                    e.preventDefault(); // Prevent default jump behavior
                    e.stopPropagation(); // Prevent bubbling up to close dropdown

                    // Load the specific section with proper loading indicator
                    if (typeof window.loadProjectSection === 'function') {
                        window.loadProjectSection(sectionId);

                        // Force dropdown to stay open
                        setTimeout(function() {
                            window.ensureDropdownOpen('selectProjectCategories');
                        }, 100);
                    } else {
                        // Fallback
                        window.getProjectsAndWorks(sectionId);
                    }

                    return false; // Prevent event propagation
                });

                container.append(link, '<br><br>');
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

function toggleSublinks(event, sublinksId) {
    event.preventDefault();
    event.stopPropagation(); // Prevent event bubbling
    var sublinks = $("#" + sublinksId);
    sublinks.slideToggle();
    $("#breaksForTitles").slideToggle();
}

// Add this new function to photoFunctions.js
function ensureDropdownOpen(sublinksId) {
    var sublinks = $("#" + sublinksId);
    if (!sublinks.is(":visible")) {
        sublinks.show();
        $("#breaksForTitles").show();
    }
}