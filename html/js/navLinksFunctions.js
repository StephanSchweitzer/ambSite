// Builds the menu from the links Ambar manages in the admin (navLinks table)
// and runs the newsletter sign-up form inside it.

// Prevents double submissions of the newsletter form
let newsletterSubmissionInProgress = false;

function loadAndInsertNavBarLinks() {
    if (window.navLinksInitialized) return;
    window.navLinksInitialized = true;

    // index.php sends the links with the page; only ask for them if it couldn't
    const sentWithPage = window.AMB_PAGE_DATA && window.AMB_PAGE_DATA.navLinks;
    const request = sentWithPage
        ? $.Deferred().resolve({ status: 'success', data: sentWithPage }).promise()
        : $.ajax({ url: '/actions/navLinksAPI.php', type: 'GET', dataType: 'json' });

    request.done(function (response) {
        if (response.status === 'success') {
            insertLinks(response.data);
            loadAndDisplayProjectTitles();

            if ($('.nav-overlay').length === 0) {
                $('body').append('<div class="nav-overlay"></div>');
            }

            $(document).off('click', '#newsletterSubmit');
            $(document).off('keypress', '#newsletterEmail');
            $(document).on('click', '#newsletterSubmit', handleNewsletterSubmit);
            $(document).on('keypress', '#newsletterEmail', handleNewsletterKeypress);

            // Apply the phone/desktop menu classes to the new links
            if (typeof setupResponsiveLayout === 'function') {
                setupResponsiveLayout();
            }
        } else {
            console.log("Error with loading links");
        }
    });
}

function handleNewsletterSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!newsletterSubmissionInProgress) {
        sendEmailToDB();
    }
    return false;
}

function handleNewsletterKeypress(event) {
    if (event.which === 13) { // Enter key
        event.preventDefault();
        event.stopPropagation();
        if (!newsletterSubmissionInProgress) {
            sendEmailToDB();
        }
        return false;
    }
}

function insertLinks(links) {
    $('#navLinksBox').empty();
    links.forEach(function (link) {
        createNewNavLinkRow(link.displayedText, link.linkRedirection, link['onclick'], link.isNewTab, link.attachedFollowingDiv);
    });

    if ($('#newsletterSignUp').length > 0) {
        $('#newsletterSignUp').html(`
            <div class="newsletter-container">
                <label for="newsletterEmail" class="sr-only">Email address</label>
                <input type="email" id="newsletterEmail" placeholder="Enter your email address" class="newsletter-input" autocomplete="email">
                <div class="button-container">
                    <button id="newsletterSubmit" class="newsletter-button">Subscribe</button>
                </div>
            </div>
        `);

        // Hidden until the Newsletter link is clicked
        $('#newsletterSignUp').hide();
    }
}

// Menu links that show a page of the site get that page's real address, so
// they can be opened in a new tab or copied; a normal click stays in the page
const pageAddresses = {
    'getProjectsAndWorks': '/select-works',
    'openInfo': '/about',
    'loadShop': '/shop',
    'openCurrentProject': '/current-project'
};

function createNewNavLinkRow(displayedText, linkRedirection, instructionString, isNewTab, attachedFollowingDiv) {
    const linkContainer = $('<div>').addClass('nav-link-container');
    const listItem = $('<a></a>');
    const instructions = instructionString
        ? instructionString.split(';').map(instr => instr.trim()).filter(Boolean)
        : [];

    let href = linkRedirection;
    instructions.forEach(function (instruction) {
        if (pageAddresses[instruction] && (!href || href === '#')) {
            href = pageAddresses[instruction];
        }
    });

    // The Shop link catches the eye now and then (ambar.css, shopGlow)
    const isShop = instructions.indexOf('loadShop') !== -1;
    listItem.attr({ href: href, class: 'mainLinkGenres' + (isShop ? ' shop-link' : '') }).text(displayedText);

    if (isNewTab == 1) {
        listItem.attr({ target: '_blank', rel: 'noopener' });
    }

    listItem.on('click', function (event) {
        if (!instructions.length) {
            return; // plain link (e.g. Instagram)
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return; // let the browser open the page in a new tab
        }
        event.preventDefault();
        instructions.forEach(function (instruction) {
            if (functionMappings[instruction]) {
                functionMappings[instruction](event);
            }
        });
    });

    linkContainer.append(listItem);
    $('#navLinksBox').append(linkContainer);

    if (attachedFollowingDiv) {
        try {
            const extra = JSON.parse(attachedFollowingDiv);
            $('#navLinksBox').append($('<div></div>').attr({ id: extra.id, class: extra.class }));
        } catch (e) {
            console.error("Error parsing attachedFollowingDiv:", e);
        }
    }
}

// What the instructions stored with each menu link do. The old
// "selectWorksAreShown" flags are no longer needed but may still be stored.
const functionMappings = {
    "getProjectsAndWorks": function () { getProjectsAndWorks(); },
    "toggleSublinks": function (event) { toggleSublinks(event, 'selectProjectCategories'); },
    "toggleNewsLetterSignUp": function (event) { toggleNewsLetterSignUp(event); },
    "loadShop": function () { loadShop(); },
    "openInfo": function () { openInfo(); },
    "openCurrentProject": function () { openCurrentProject(); },
    "selectWorksAreShown": function () {},
    "selectWorksAreNotShown": function () {}
};

// One link in the "Works" dropdown: a project, or one of the year groups
// listed under a project that is shown in year groups
function projectCategoryLink(sectionId, text) {
    const link = $('<a>').attr('href', '/select-works#' + sectionId).text(text);

    link.on('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }
        e.preventDefault();
        e.stopPropagation(); // keep the dropdown open
        openProjectSection(sectionId);
    });

    return link;
}

// Shows a project (or one of its year groups) on the Works page; on phones
// the drawer closes first so the works are visible
function openProjectSection(sectionId) {
    if (window.innerWidth <= 992) {
        $('#hamburgerMenu').removeClass('active').attr({ 'aria-expanded': 'false', 'aria-label': 'Open menu' });
        $('#navLinksBox').removeClass('active');
        $('.nav-overlay').removeClass('active');
        $('#sideBySide').removeClass('menu-open');
    }
    loadProjectSection(sectionId);
}

// A project's name in the "Works" dropdown, when it has years folded away
// underneath. On a computer, clicking it unfolds them instead of going
// anywhere, the way "Works" itself unfolds the projects; one project's years
// at a time, so the menu stays short. On a phone the years aren't listed
// (ambar.css: the drawer ran off the screen with them, and people kept
// tapping a name that only opened and closed), so there the name goes
// straight to the project. (The link keeps its address, so it still works
// as a link before this script has run, and for anything that doesn't run
// scripts.)
function projectYearsToggle(title, yearsId) {
    const sectionId = projectSectionId(title);
    const link = $('<a>')
        .addClass('project-link')
        .attr({ href: '/select-works#' + sectionId, 'aria-expanded': 'false', 'aria-controls': yearsId })
        .text(title);

    link.on('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }
        e.preventDefault();
        e.stopPropagation(); // keep the Works list open

        if (window.innerWidth <= 992) {
            openProjectSection(sectionId);
            return;
        }

        const years = $('#' + yearsId);
        const opening = !years.is(':visible');

        $('#selectProjectCategories .project-years').not(years).slideUp(200);
        $('#selectProjectCategories .project-link').not(this).attr('aria-expanded', 'false');

        years.slideToggle(220);
        $(this).attr('aria-expanded', opening ? 'true' : 'false');
    });

    return link;
}

// The project names under "Works" — from the same request the Works page
// uses — each with its year groups under it where it has them (mirrors the
// same list in ambRenderNav(), actions/publicPageFunctions.php)
function loadAndDisplayProjectTitles() {
    fetchPublicWorks('projects').then(function (projects) {
        const container = $('#selectProjectCategories');
        container.empty();
        projects.forEach(function (project) {
            const sectionId = projectSectionId(project.title);
            const years = $('<div>').addClass('project-years').attr('id', 'years-' + sectionId);

            workGroups(project).forEach(function (group) {
                if (!group.label) {
                    return; // the undated group has no heading to jump to
                }
                years.append(
                    projectCategoryLink(groupSectionId(project.title, group.label), group.label)
                        .addClass('project-year-link')
                );
            });

            // A project with years unfolds them when its name is clicked (on
            // a computer); one without them goes to the project
            if (!years.children().length) {
                container.append(projectCategoryLink(sectionId, project.title));
                return;
            }
            container.append(projectYearsToggle(project.title, 'years-' + sectionId), years);
        });
    }, function () {
        console.log('Error loading project titles.');
    });
}

function toggleNewsLetterSignUp(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation(); // keep the mobile menu open
    }

    var newsletterForm = $("#newsletterSignUp");
    newsletterForm.slideToggle(300, function () {
        if (newsletterForm.is(":visible")) {
            $("#newsletterEmail").focus();
        }
    });

    if (window.innerWidth <= 992) {
        $('#navLinksBox').addClass('active');
    }
    return false;
}

// Inline feedback under the newsletter form
function showNewsletterMessage(text, type) {
    let container = $(".newsletter-container");
    let msg = container.find(".newsletter-message");
    if (msg.length === 0) {
        msg = $('<p>').addClass('newsletter-message').attr('role', 'status');
        container.append(msg);
    }
    msg.removeClass('success error').addClass(type).text(text).stop(true, true).show();
    if (type === 'success') {
        msg.delay(4000).fadeOut(400);
    }
}

function sendEmailToDB() {
    const email = $("#newsletterEmail").val();
    if (!validateEmail(email)) {
        showNewsletterMessage("Please enter a valid email address.", "error");
        return;
    }

    newsletterSubmissionInProgress = true;
    $("#newsletterSubmit").prop('disabled', true);

    $.ajax({
        url: '/actions/newsletterAPI.php',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ email: email }),
        success: function (response) {
            if (response.status === 'success') {
                $("#newsletterEmail").val("");
                showNewsletterMessage("Thank you for subscribing!", "success");
                if (typeof quietNewsletterFloat === 'function') {
                    quietNewsletterFloat(); // signed up: no more reminders
                }
                if (window.innerWidth <= 992) {
                    setTimeout(function () {
                        $('#navLinksBox').addClass('active');
                    }, 100);
                }
            } else {
                showNewsletterMessage(response.message || "Something went wrong. Please try again.", "error");
            }
        },
        error: function (xhr, status, error) {
            console.error("Error sending email:", error);
            showNewsletterMessage(xhr.status === 429 && xhr.responseJSON && xhr.responseJSON.message
                ? xhr.responseJSON.message : "An error occurred. Please try again later.", "error");
        },
        complete: function () {
            newsletterSubmissionInProgress = false;
            $("#newsletterSubmit").prop('disabled', false);
        }
    });
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Works opens and closes its list of projects on a computer. On a phone the
// list is always open in the drawer (ambar.css), so there Works simply goes
// to the works and closes the drawer, like every other link.
function toggleSublinks(event, sublinksId) {
    if (window.innerWidth <= 992) {
        return;
    }
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    $("#" + sublinksId).slideToggle();
    return false;
}

// Open (rather than toggle) the newsletter form and focus the email field —
// used by the floating newsletter nudge
function ensureNewsletterOpen() {
    var newsletterForm = $("#newsletterSignUp");
    if (newsletterForm.is(":visible")) {
        $("#newsletterEmail").focus();
    } else {
        newsletterForm.slideDown(300, function () {
            $("#newsletterEmail").focus();
        });
    }
}

function ensureDropdownOpen(sublinksId) {
    var sublinks = $("#" + sublinksId);
    if (!sublinks.is(":visible")) {
        sublinks.show();
    }
}

// Start-up. Kept at the end of the file: with the links sent along with the
// page this runs straight away, so everything above must be defined first.
(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAndInsertNavBarLinks);
    } else {
        loadAndInsertNavBarLinks();
    }
})();
