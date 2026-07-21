var selectWorksAreShown = false;
var currentImageIndex = 0; // Global variable to track the current image index
let images = []; // Global array to store image URLs
let startX, startY;
let isPinching = false;
var imageIsRows = ''; //img-containerForRows - keep as empty string for single column
var projectIsRows = ''; //projectWorksForRows - keep as empty string for single column
var isMobile = false;
var zIndexCounter = 22;
var scrollPosition = 0;

$(window).on("load", function() {
    // Check responsive layout
    setupResponsiveLayout();

    // Fix width of all thumbnails
    $('.size12020, .size12021, .size12022').each(function(index, element) {
        let theWidth = this.width;
        $(this).closest('.holdForNow, .holdForNowNew').css("min-width", (theWidth - 1) + "px");
        $(this).closest('.holdPhotoandBlack, .holdPhotoandBlackNew').css("min-width", (theWidth - 1) + "px");

        // Correct the source of the larger images
        let idOfForm = "#" + ($(this).hasClass('size12020') ? '20' :
                $(this).hasClass('size12021') ? '21' : '22') +
            $(this).attr("id") + "IMG";
        let imgPath = $(idOfForm).attr("sourceForJS");
        $(idOfForm).attr("src", imgPath);
    });

    // Make invisible elements visible with a delay for text
    $('.invisible').removeClass('invisible');

    setTimeout(function() {
        $('.invisibleText').removeClass('invisibleText');
    }, 500);

    createAndShowSideBarLinks();
});

// Add window resize handler
$(window).on("resize", function() {
    setupResponsiveLayout();
});

function setupResponsiveLayout() {
    if (window.innerWidth <= 992) {
        // Apply mobile classes
        $('#popUpImage').removeClass('popUpImage').addClass('popUpImageMobile');
        $('#imagesAndContent').removeClass('imagesAndContent').addClass('imagesAndContentMobile');
        $('#blockForHeader').removeClass('blockForHeader').addClass('blockForHeaderMobile');
        $('#whiteForTheTopMaybe').addClass('headerNoMove3');
        $("#whiteForTheTopMaybe").attr('id', 'whiteForTheTop');
        $('#whiteForTheTop').addClass('headerNoMove3');
        $('#navLinksBox').removeClass('navLinksBox').addClass('navLinksBoxMobile');
        $('#homePageCarousel').removeClass('homePageCarousel').addClass('homePageCarouselMobile');
        $('#selectProjectCategories').removeClass('hiddenLinkStuff').addClass('hiddenLinkStuffMobile');
        $('#ambName').removeClass('ambarNamePic').addClass('ambarNamePicMobile');

        imageIsRows = '';
        projectIsRows = '';
        isMobile = true;

        // Improve tap targets for mobile
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
    } else {
        // Apply desktop classes
        $('#popUpImage').removeClass('popUpImageMobile').addClass('popUpImage');
        $('#imagesAndContent').removeClass('imagesAndContentMobile').addClass('imagesAndContent');
        $('#blockForHeader').removeClass('blockForHeaderMobile').addClass('blockForHeader');
        $('#navLinksBox').removeClass('navLinksBoxMobile').addClass('navLinksBox');
        $('#homePageCarousel').removeClass('homePageCarouselMobile').addClass('homePageCarousel');
        $('#selectProjectCategories').removeClass('hiddenLinkStuffMobile').addClass('hiddenLinkStuff');
        $('#ambName').removeClass('ambarNamePicMobile').addClass('ambarNamePic');

        imageIsRows = '';
        projectIsRows = '';
        isMobile = false;

        // Reset tap targets for desktop
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach(link => {
            link.style.padding = '';
            link.style.margin = '';
        });
    }
}

$(document).ready(function() {
    // Setup mobile menu toggle
    $('#hamburgerMenu').on('click', function(e) {
        e.stopPropagation();
        $(this).toggleClass('active');
        $('#navLinksBox').toggleClass('active');
        $('.nav-overlay').toggleClass('active');
        $('#sideBySide').toggleClass('menu-open');
    });

    // Close menu when clicking the overlay
    $('.nav-overlay').on('click', function() {
        $('#hamburgerMenu').removeClass('active');
        $('#navLinksBox').removeClass('active');
        $(this).removeClass('active');
        $('#sideBySide').removeClass('menu-open');
    });

    // Special handling for newsletter and submenu toggles
    $(document).on('click', '#navLinksBox a', function(e) {
        if (window.innerWidth <= 992) {
            // Check if this is a toggle link (for newsletter or submenu)
            const isToggleLink = (
                $(this).text() === "Works" ||
                $(this).text() === "Newsletter"
            );

            // If it's a toggle link, prevent menu from closing
            if (isToggleLink) {
                e.stopPropagation();
            } else if (!$(this).closest('#selectProjectCategories').length &&
                !$(this).closest('#newsletterSignUp').length) {
                // If it's a regular link (not in a submenu or newsletter), close the menu
                $('#hamburgerMenu').removeClass('active');
                $('#navLinksBox').removeClass('active');
                $('.nav-overlay').removeClass('active');
                $('#sideBySide').removeClass('menu-open');
            }
        }
    });

    // Prevent newsletter form clicks from closing the menu
    $(document).on('click', '#newsletterSignUp, #newsletterEmail, #newsletterSubmit', function(e) {
        if (window.innerWidth <= 992) {
            e.stopPropagation();
        }
    });

    // Setup modal for click outside to close
    $('#bigPicModal').on('click', function(event) {
        if (!$(event.target).closest('#popUpImage, .modal-nav-arrows, .nav-arrow').length) {
            $('#bigPicModal').modal('hide');
        }
    });

    // Modal scroll management
    $('.modal').on('hidden.bs.modal', function() {
        $('body').removeClass('no-scroll').css('top', '');
        $(window).scrollTop(scrollPosition);
        $('#modifyZIndex').removeClass('headerNoMove2').addClass('headerNoMove');
        $('#whiteForTheTop').removeClass('headerNoMove3').addClass('whiteComeAndGo');
    });

    $('.modal').on('show.bs.modal', function() {
        scrollPosition = $(window).scrollTop();
        $('body').addClass('no-scroll').css('top', -scrollPosition);
        $('#modifyZIndex').removeClass('headerNoMove').addClass('headerNoMove2');
        $('#whiteForTheTop').removeClass('whiteComeAndGo').addClass('headerNoMove3');
    });

    // Image modal click handlers
    document.getElementById('popUpImage').addEventListener('click', function(event) {
        if (isPinching) {
            return;
        }
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
        if ($('#bigPicModal').hasClass('show')) {
            if (event.keyCode === 37) { // Left arrow key
                changeImage(-1); // Go to the previous image
            } else if (event.keyCode === 39) { // Right arrow key
                changeImage(1); // Go to the next image
            }
        }
    });

    // Touch events for mobile
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
            } else if (Math.abs(deltaX) > window.innerWidth * 0.1 && !isPinching) {
                // Horizontal swipe exceeds threshold
                changeImage(deltaX > 0 ? -1 : 1);
            } else {
                // Swipe did not meet any criteria for action
                this.style.transform = '';  // Reset position
            }
        }
    }, false);

    // Add arrow navigation
    const prevArrow = document.getElementById('prevImage');
    const nextArrow = document.getElementById('nextImage');

    if (prevArrow) {
        prevArrow.addEventListener('click', function() {
            changeImage(-1);
        });
    }

    if (nextArrow) {
        nextArrow.addEventListener('click', function() {
            changeImage(1);
        });
    }

    // Determine page type by route and load appropriate content
    var path = window.location.pathname;

    if (path === '/shop') {
        loadShop();
    } else if (path === '/select-works') {
        getProjectsAndWorks();
    } else if (path === '/about') {
        openInfo();
    } else if (path === '/current-project') {
        openCurrentProject();
    } else {
        getCarousel();
    }
});

function createAndShowSideBarLinks() {
    return;
    // Keep empty as per original code
}

function accessPictureForm(divName) {
    let newDiveName = '#' + divName;
    $(newDiveName).modal('show');
}

function getProjectsAndWorks(partOfThePage) {
    $('#imagesAndContent').css('padding-top', '50px');

    if (selectWorksAreShown) {
        return;
    }

    $.ajax({
        url: "../actions/projectsAPI.php",
        type: "GET",
        data: {'activity': 'active'},
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

// Add this to photoFunctions.js
function loadProjectSection(projectSectionId) {
    // Create and show a fixed loading overlay
    ensureDropdownOpen('selectProjectCategories');

    const loadingOverlay = $('<div>').addClass('fullpage-loading')
        .html('<div class="loading-spinner"></div><p>Loading images...</p>');
    $('body').append(loadingOverlay);

    // Make sure projects are loaded
    if (!selectWorksAreShown) {
        // If projects aren't loaded, load them first
        $.ajax({
            url: "../actions/projectsAPI.php",
            type: "GET",
            data: {'activity': 'active'},
            dataType: "json",
            success: function(data) {
                makeProjectCards(data, null); // Load projects but don't scroll yet

                // After projects load, wait for images and then scroll
                preloadVisibleImagesAndScroll(projectSectionId);
            },
            error: function(xhr, status, error) {
                console.log("Error loading projects:", error);
                $('.fullpage-loading').remove();
            }
        });
    } else {
        // Projects already loaded, just preload visible images and scroll
        preloadVisibleImagesAndScroll(projectSectionId);
    }
}

// Helper function to preload images and scroll
function preloadVisibleImagesAndScroll(projectSectionId) {
    const targetSection = document.getElementById(projectSectionId);
    if (!targetSection) {
        $('.fullpage-loading').remove();
        return;
    }

    // Get all unloaded images in the document
    const lazyImages = document.querySelectorAll('img[data-src]');

    // If no images need loading, scroll immediately
    if (lazyImages.length === 0) {
        $('.fullpage-loading').remove();
        smoothScrollTo(projectSectionId);
        return;
    }

    // Create a counter to track loaded images
    let loadedCount = 0;
    let errorCount = 0;
    const totalImages = lazyImages.length;

    // Update loading message
    $('.fullpage-loading p').text(`Loading images (0/${totalImages})...`);

    // Set a safety timeout in case some images never load
    const safetyTimeout = setTimeout(() => {
        // Force finish loading after 10 seconds if not all images loaded
        if (loadedCount + errorCount < totalImages) {
            console.warn(`Timed out waiting for all images. Loaded: ${loadedCount}, Errors: ${errorCount}, Total: ${totalImages}`);

            // Force load remaining images
            lazyImages.forEach(img => {
                if (!img.classList.contains('loaded') && !img.classList.contains('error')) {
                    img.src = img.dataset.src || '';
                    img.removeAttribute('data-src');
                    img.classList.add('loaded');
                }
            });

            // Remove overlay and scroll
            $('.fullpage-loading').fadeOut(300, function() {
                $(this).remove();
                smoothScrollTo(projectSectionId);
            });
        }
    }, 10000); // 10 second timeout

    // Function to check if loading is complete
    function checkComplete() {
        if (loadedCount + errorCount >= totalImages) {
            clearTimeout(safetyTimeout);

            // All images processed, remove overlay and scroll
            $('.fullpage-loading').fadeOut(300, function() {
                $(this).remove();
                smoothScrollTo(projectSectionId);
            });
        } else {
            // Update progress message
            $('.fullpage-loading p').text(`Loading images (${loadedCount + errorCount}/${totalImages})...`);
        }
    }

    // Load all images with proper error handling
    lazyImages.forEach(img => {
        // Skip if already loaded
        if (img.classList.contains('loaded') || img.classList.contains('error')) {
            loadedCount++;
            checkComplete();
            return;
        }

        const newImg = new Image();

        newImg.onload = function() {
            // Replace data-src with actual src
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
            loadedCount++;
            checkComplete();
        };

        newImg.onerror = function() {
            console.error('Failed to load image:', img.dataset.src);
            // Mark as error but still show something
            img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22232%22%20height%3D%22131%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20232%20131%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_188f638d5a2%20text%20%7B%20fill%3A%236c757d%3Bfont-family%3Avar%28--font-primary%29%3Bfont-size%3A12px%3Bfont-weight%3Avar%28--font-weight-light%29%3B%20%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_188f638d5a2%22%3E%3Crect%20width%3D%22232%22%20height%3D%22131%22%20fill%3D%22%23f5f5f5%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2288.5%22%20y%3D%2270.6%22%3EImage%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
            img.removeAttribute('data-src');
            img.classList.add('error');
            errorCount++;
            checkComplete();
        };

        // Start loading (with a slight delay between images to prevent overloading)
        setTimeout(() => {
            newImg.src = img.dataset.src;
        }, 50 * lazyImages.indexOf(img)); // Stagger loading slightly
    });
}

// Smooth scrolling function
function smoothScrollTo(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    console.log("scrolling now")

    const headerOffset = 100;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}


// Modify the jumpToSection function in photoFunctions.js
function jumpToSection(partOfThePage) {
    if (partOfThePage != null) {
        loadProjectSection(partOfThePage);
    }
}

function fetchWorkIdsForProject(id) {
    return $.ajax({
        url: '../actions/worksOfProjectsAPI.php',
        type: 'GET',
        data: {'projectId': id},
        dataType: 'json'
    });
}

function createProjectElement(project) {
    let title = project.title;
    let description = project.description ? project.description.replace(/\n/g, '<br>') : '';

    // Create project wrapper with the SINGLE column layout
    let projectDiv = $('<div>').addClass('project').attr({
        'alt': title,
        'id': 'projectSection' + title.trim()
    }).css({
        'border': '0px',
        'text-align': 'center'
    });

    // Create header section
    let titleAndDescriptionDiv = $('<div>').addClass('project-header');
    let insertTitle = $('<h2>').text(title).addClass('project-title');
    let insertDescription = $('<p>').html(description).addClass('project-description');

    titleAndDescriptionDiv.append(insertTitle, insertDescription);

    // Create works container with SINGLE column layout
    let worksOfProjectDiv = $('<div>').addClass('projectWorks');

    // Assemble project
    projectDiv.append(titleAndDescriptionDiv).append(worksOfProjectDiv);

    return projectDiv;
}

function makeProjectCards(projects, partOfThePage) {
    $('#imagesAndContent').empty();
    images.length = 0;

    // Show loading indicator
    $('#imagesAndContent').html('<div class="loading-container"><div class="loading-spinner"></div><p>Loading projects...</p></div>');

    let projectPromises = projects.map(project => {
        return fetchWorkIdsForProject(project.id).then(workIds => {
            return getWorksInfoFromIdsArray(workIds).then(allWorksForProject => {
                return {project, allWorksForProject}; // Return project info with its works
            });
        });
    });

    Promise.all(projectPromises).then(results => {
        $('#imagesAndContent').empty();

        results.forEach(({project, allWorksForProject}) => {
            let mainProj = createProjectElement(project);
            allWorksForProject.forEach(information => {
                let card = createWorkCardElement(information);
                mainProj.find('.projectWorks').first().append(card);
            });
            if (projects[projects.length - 1].title != project.title) {
                mainProj.append('<div class="work-separator" id="seperator' + project.title + '"> ✧ ˚. ࣪ ˖ ·ﾟ ·ﾟ·:。·ﾟﾟ·✮ ⋆ ˚。☆ ⋆。°✩·ﾟ ·ﾟ·:。·ﾟﾟ·°˖✧</div>');
            }
            $('#imagesAndContent').append(mainProj);
        });

        // Enable lazy loading
        enableLazyLoading();

        // Jump to specific section if needed
        jumpToSection(partOfThePage);

        // Update browser history and title
        history.pushState({page: 'select-works'}, 'Select Works', '/select-works');
        document.title = 'Select Works - Ambar Velasco';
    }).catch(error => {
        console.error('Error:', error);
        $('#imagesAndContent').html('<div class="error-message"><p>Sorry, there was a problem loading projects. Please try again later.</p></div>');
    });
}

// Enable lazy loading for images
// Add this to enhance the enableLazyLoading function
function enableLazyLoading() {
    // First, handle any images that should be immediately visible
    const immediateLoadImages = document.querySelectorAll('img[data-src]:not(.lazy-defer)');
    immediateLoadImages.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
    });

    // Then set up lazy loading for the rest
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                }
            });
        }, { rootMargin: '200px 0px' }); // Larger margin to start loading earlier

        document.querySelectorAll('img[data-src].lazy-defer').forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for browsers without IntersectionObserver
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
        });
    }
}

function createWorkCardElement(information) {
    let imageURL = "baseImages/" + information.location;
    let thumbnailURL = "baseImages/" + information.location;
    let title = information.name;
    let description = information.firstDescription ? information.firstDescription.replace(/\n/g, '<br>') : '';
    let long_description = information.long_description;

    // Create image info object for the modal
    let imageInfo = {
        url: imageURL,
        title: title,
        description: description,
        long_description: long_description
    };

    // Create image container
    let imageContainer = $('<div>').addClass('img-container');

    // Create the image element with data-src for lazy loading
    let imgElement = $('<img>')
        .attr({
            'data-src': thumbnailURL,
            'src': 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', // Tiny placeholder
            'alt': title,
            'title': title,
            'decoding': 'async'
        });

    imageContainer.append(imgElement);

    // Create overlay that shows on hover
    let overlay = $('<div>').addClass('img-overlay');
    let overlayTitle = $('<h3>').text(title).addClass('overlay-title');
    overlay.append(overlayTitle);
    imageContainer.append(overlay);

    // Create card
    let card = $('<div>').addClass('card').attr('alt', title).css({
        'border': '0px',
        'text-align': 'center'
    }).append(imageContainer);

    // Add click handler
    card.on('click', function() {
        makeBigPic(imageURL);
    });

    // Add to global images array
    images.push(imageInfo);

    return card;
}

function getWorksInfoFromIdsArray(projectIds) {
    return $.ajax({
        url: '../actions/getWorksByIdArray.php',
        method: 'GET',
        data: {'projectIds': projectIds},
        dataType: 'json',
    });
}

function getCarousel() {
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

function createCarousel(informations) {
    images.length = 0;

    // Create the carousel structure
    let carouselHtml = `<div id="homePageCarousel" class="carousel slide homePageCarousel" data-ride="carousel">
        <div class="carousel-inner" id="insertImagesHere" class="insertImagesHere">`;

    let active = 'active';

    // Add images to carousel
    informations.forEach(function(information) {
        let imageURL = "baseImages/" + information.location;
        let thumbnailURL = "thumbnails/" + information.location;
        let title = information.name;
        let description = information.firstDescription ? information.firstDescription.replace(/\n/g, '<br>') : '';

        let imageInfo = {
            url: imageURL,
            title: title,
            description: description
        };

        let thisImage = `<div id="${information.name}" class="carousel-item ${active}" >
            <img class="d-block carousel-pic" src="${thumbnailURL}" alt="${title}" decoding="async" onclick="makeBigPic('${imageURL}')">
            </div>`;

        carouselHtml += thisImage;
        active = '';
        images.push(imageInfo);
    });

    // Add carousel controls
    carouselHtml += `<a class="carousel-control-prev" href="#homePageCarousel" role="button" data-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="sr-only">Previous</span>
        </a>
        <a class="carousel-control-next" href="#homePageCarousel" role="button" data-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="sr-only">Next</span>
        </a>
        </div>`;

    document.getElementById('imagesAndContent').innerHTML = carouselHtml;

    $('#homePageCarousel').carousel({
        interval: 3000
    });

    if (isMobile) {
        $('#homePageCarousel').removeClass('homePageCarousel').addClass('homePageCarouselMobile');
    }
}

function makeBigPic(clickedImageUrl) {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.style.display = 'block';

    // Find the index of the clicked image in our images array
    currentImageIndex = images.findIndex(image => image.url === clickedImageUrl);
    let currentImage = images[currentImageIndex];
    const imgElement = document.getElementById('popUpImage');

    // Clear current image while loading
    imgElement.src = '';

    // Show modal first with loading spinner
    $('#bigPicModal').modal('show');

    // Force scroll to top immediately
    $('#bigPicModal .modal-body').scrollTop(0);

    // Then set the new image source
    imgElement.src = currentImage.url;

    // Handle image loading
    imgElement.onload = function() {
        if (spinner) spinner.style.display = 'none';
        document.getElementById('imageTitle').textContent = currentImage.title;
        document.getElementById('imageDescription').innerHTML = currentImage.description;
    };

    // Handle load errors
    imgElement.onerror = function() {
        if (spinner) spinner.style.display = 'none';
        console.error('Failed to load image:', currentImage.url);
        document.getElementById('imageTitle').textContent = 'Image failed to load';
        document.getElementById('imageDescription').innerHTML = 'Sorry, there was a problem loading this image.';
    };
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
    if (spinner) spinner.style.display = 'block';

    // Clear previous image and text
    imgElement.style.transform = '';
    imgElement.src = '';  // Clear the source to trigger loading state

    // Set the new image source
    const newImageSrc = images[currentImageIndex].url;
    imgElement.src = newImageSrc;

    // Wait for the image to load
    imgElement.onload = function() {
        // Hide the loading spinner
        if (spinner) spinner.style.display = 'none';

        // Update the text once the image has loaded
        document.getElementById('imageTitle').innerHTML = images[currentImageIndex].title;
        document.getElementById('imageDescription').innerHTML = images[currentImageIndex].description;
    };

    // Handle load errors
    imgElement.onerror = function() {
        if (spinner) spinner.style.display = 'none';
        console.error('Failed to load image:', newImageSrc);
        document.getElementById('imageTitle').textContent = 'Image failed to load';
        document.getElementById('imageDescription').innerHTML = 'Sorry, there was a problem loading this image.';
    };
}

function fetchCurrentAboutMe() {
    return $.ajax({
        url: '../actions/aboutMeAPI.php',
        type: 'GET',
        dataType: 'json',
    });
}

async function openInfo() {
    $('#imagesAndContent').css('padding-top', '50px');

    try {
        const aboutMe = await fetchCurrentAboutMe();
        let description = aboutMe.description ? aboutMe.description.replace(/\n/g, "<br>") : '';
        let imageLocation = aboutMe.pictureLocation || 'baseImages/bubbers.jpg';

        // Use window.innerWidth instead of user-agent detection for responsive layout
        if (window.innerWidth <= 1206) {
            document.getElementById('imagesAndContent').innerHTML = `
          <div class="infoflexMobile">
            <div class="ambPicDiv">
              <img src="${imageLocation}" id="ambarPersoPic" alt="Portrait of Ambar Velasco" decoding="async">
            </div>
            <p>${description}</p>
          </div>
          `;
        } else {
            document.getElementById('imagesAndContent').innerHTML = `
          <div class="infoflex">
            <div class="size1" id="aboutMeInfo">
              <p>${description}</p>
            </div>
            <div class="size2">
              <div class="ambPicDiv">
                <img src="${imageLocation}" id="ambarPersoPic" alt="Portrait of Ambar Velasco" decoding="async">
              </div>
            </div>
          </div>
          `;
        }

        // Close mobile menu if open
        if (window.innerWidth <= 992) {
            $('#hamburgerMenu').removeClass('active');
            $('#navLinksBox').removeClass('active');
            $('.nav-overlay').removeClass('active');
            $('#sideBySide').removeClass('menu-open');
        }

        history.pushState({page: 'about'}, 'About - Ambar Velasco', '/about');
        document.title = 'About - Ambar Velasco';
    } catch (error) {
        console.error('Error loading about information:', error);
        $('#imagesAndContent').html(`
            <div class="error-message">
                <p>Sorry, we couldn't load the About Me information. Please try again later.</p>
            </div>
        `);
    }
}

function openCurrentProject() {
    $('#imagesAndContent').css('padding-top', '50px');

    $.ajax({
        url: "../actions/projectsAPI.php",
        type: "GET",
        data: {'activity': 'currentProject'},
        dataType: "json",
        success: function(data) {
            makeCurrentProjectCards(data);
        },
        error: function() {
            console.log("An error occurred.");
            $('#imagesAndContent').html(`
                <div class="error-message">
                    <p>Sorry, we couldn't load the current project. Please try again later.</p>
                </div>
            `);
        },
    });

    selectWorksAreShown = false;
}

function createCurrentProjectElement(project) {
    let worksOfProjectDiv = $('<div>').addClass('projectWorks');
    let titleAndDescriptionDiv = $('<div>');
    let title = project.title;
    let description = project.description ? project.description.replace(/\n/g, '<br>') : '';
    let insertTitle = $('<h2>').text(title).css('margin-bottom', '30px');
    let insertDescription = $('<p>').html(description).css({
        'color': '#71797E',
        'margin-bottom': '60px'
    });

    titleAndDescriptionDiv.append(insertTitle, insertDescription);

    let projectDiv = $('<div>').addClass('project').attr({
        'alt': title,
        'id': 'projectSection' + title.trim()
    }).css({'border': '0px', 'text-align': 'center'});

    projectDiv.append(titleAndDescriptionDiv).append(worksOfProjectDiv);

    return projectDiv;
}

async function createCurrentProjectWorkCardElement(information) {
    let imageURL = "baseImages/" + information.location;
    let title = information.name;
    let description = information.firstDescription ? information.firstDescription.replace(/\n/g, '<br>') : '';
    let long_description = '';
    if (information.long_description) {
        long_description = information.long_description.replace(/\n/g, '<br>');
    }

    let imageInfo = {
        url: imageURL,
        title: title,
        description: description,
        long_description: long_description
    };

    try {
        const {width: imageWidth, height: imageHeight} = await loadCorrectWidthAndHeightPerImage(imageURL);

        let insertTitle = $('<p>').html('<b><i>' + title + '</i></b>');
        let imageButton = $('<span>').text('Image');
        let textButton = $('<span>').text('Description');
        let buttonContainer = $('<div>').addClass('buttonContainer').append(imageButton, textButton);

        if (isMobile) {
            buttonContainer.css('paddingBottom', '15px');
        }

        let imageContainer = $('<div>').addClass('img-container ' + imageIsRows)
            .append($('<img>').addClass("currentProjectImage")
                .attr('src', imageURL)
                .attr('alt', 'Image of ' + title)
                .attr('Title', title)
                .attr('Description', description));

        let insertDescription = $('<div>').html(long_description).addClass('description_text').css({
            position: 'relative',
            maxWidth: '80%',
            margin: 'auto',
            cursor: 'default',
            overflowY: 'auto',
            zIndex: zIndexCounter,
            paddingLeft: '20px',
            paddingRight: '20px'
        }).hide();

        zIndexCounter++;

        let contentHolder = $('<div>').attr({'id': 'projectSection' + information.id.trim()})
            .addClass('projectImgTxtContainer')
            .css({
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            })
            .append(imageContainer, insertDescription);

        let card = $('<div>').addClass('card').attr('alt', title).css({
            'border': '0px',
            'text-align': 'center',
            'margin-bottom': '60px',
        }).append(buttonContainer).append(contentHolder);

        imageContainer.click(() => makeBigPic(imageURL));
        images.push(imageInfo);

        buttonContainer.click((event) => {
            if (insertDescription.is(":hidden")) {
                imageContainer.fadeToggle().promise().done(() => {
                    insertDescription.fadeToggle();
                });
            } else {
                insertDescription.fadeToggle().promise().done(() => {
                    imageContainer.fadeToggle();
                });
            }
        });

        return card;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function loadCorrectWidthAndHeightPerImage(imageURL) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageURL;

        img.onload = function() {
            let screenWidth = $(window).width();
            let screenHeight = $(window).height();
            let newWidth = img.width;
            let newHeight = img.height;
            let maxWidth = (screenWidth * .655) - 29;
            let minWidth = screenWidth * .50;
            let maxHeight = screenHeight * .65;

            if (newWidth < minWidth) {
                const ratio = minWidth / newWidth;
                newWidth = minWidth;
                newHeight = newHeight * ratio;
                resolve({width: newWidth, height: newHeight});
            }

            if (newWidth > maxWidth) {
                const ratio = maxWidth / newWidth;
                newWidth = maxWidth;
                newHeight = newHeight * ratio;
            }

            if (newHeight > maxHeight) {
                const ratio = maxHeight / newHeight;
                newHeight = maxHeight;
                newWidth = newWidth * ratio;
            }

            resolve({width: newWidth, height: newHeight});
        };

        img.onerror = function() {
            reject('Error loading image: ' + imageURL);
        };
    });
}

async function makeCurrentProjectCards(projects) {
    $('#imagesAndContent').empty();
    images.length = 0;

    let projectPromises = projects.map(async project => {
        let workIds = await fetchWorkIdsForProject(project.id);
        let allWorksForProject = await getWorksInfoFromIdsArray(workIds);
        return { project, allWorksForProject }; // Return project info with its works
    });

    try {
        let results = await Promise.all(projectPromises);

        for (const { project, allWorksForProject } of results) {
            let mainProj = createCurrentProjectElement(project);
            $('#imagesAndContent').append(mainProj);

            for (const information of allWorksForProject) {
                let card = await createCurrentProjectWorkCardElement(information);
                if (card) {
                    mainProj.find('.projectWorks').first().append(card);
                }
            }
        }

        history.pushState({ page: 'current-project' }, 'Current Project', '/current-project');
        document.title = 'Current Project - Ambar Velasco';
        adjustDescriptionHeightsAndWidths();
    } catch (error) {
        console.error('Error:', error);
        $('#imagesAndContent').html(`
            <div class="error-message">
                <p>Sorry, we couldn't load the current project. Please try again later.</p>
            </div>
        `);
    }
}

function adjustDescriptionHeightsAndWidths() {
    $('.img-container').each(function() {
        // Find the next .description_text element
        let descriptionText = $(this).next('.description_text');
        let descriptionContent = descriptionText[0];

        if (descriptionText.length) {
            // Get the height of the img-container
            let containerHeight = $(this).height();
            let containerWidth = $(this).width();

            if (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))) {
                containerHeight += 20;
            }

            descriptionText.show();
            let contentHeight = descriptionContent.scrollHeight;
            descriptionText.hide();

            // Adjust the height of the description_text element
            descriptionText.css("max-height", containerHeight + "px");
            descriptionText.css("min-height", containerHeight + "px");
            descriptionText.css("width", containerWidth + "px");

            if (!isMobile) {
                descriptionText.css('padding-top', '20px');
            } else {
                descriptionText.css('padding-top', '5px');
            }
        }
    });
}

function loadShop() {
    yearData = { activity: 'active' };
    $.ajax({
        url: "../actions/shopAPI.php",
        type: "GET",
        data: yearData,
        dataType: "json",
        success: function(data) {
            $('#imagesAndContent').empty();
            $('#imagesAndContent').css('padding-top', '50px');

            $('<div>', {
                class: 'shop-top-space'
            }).prependTo('#imagesAndContent');

            data.forEach(function(item) {
                $('#imagesAndContent').append(createShopItem(item));
            });

            history.pushState({page: 'shop'}, 'Shop', '/shop');
            document.title = 'Shop - Ambar Velasco';
        },
        error: function() {
            console.log("An error occurred.");
            $('#imagesAndContent').html(`
                <div class="error-message">
                    <p>Sorry, we couldn't load the shop items. Please try again later.</p>
                </div>
            `);
        }
    });
}

function createShopItem(item) {
    // The shop API returns a Shopify buy-button embed (buttonCode) per item;
    // the embed renders the product image, price and purchase button itself.
    let shopItem = $('<div>').addClass('shopItem');
    let buyButtonDiv = $('<div>').addClass('buy-button-embed').html(item.buttonCode);

    shopItem.append(buyButtonDiv);

    return shopItem;
}

// Make functions available globally
window.makeBigPic = makeBigPic;
window.getProjectsAndWorks = getProjectsAndWorks;
window.openInfo = openInfo;
window.openCurrentProject = openCurrentProject;
window.loadShop = loadShop;
window.loadProjectSection = loadProjectSection;
window.ensureDropdownOpen = function(sublinksId) {
    var sublinks = $("#" + sublinksId);
    if (!sublinks.is(":visible")) {
        sublinks.show();
    }
};