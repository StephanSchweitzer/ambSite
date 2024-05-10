function updateLinks()
{
    return
}

const list = document.getElementById('navbar');
const navItems = document.querySelectorAll('.dragNavBar');
let draggedItem = null;

list.addEventListener('dragstart', function (e) {
    draggedItem = e.target;
    // Add the 'dragging' class to the dragged item
    e.target.classList.add('dragging');

    // Temporarily disable hover effects on all dragNavBar items
    navItems.forEach(item => {
        item.classList.add('dragging');
    });
    draggedItem.style.opacity = '0.5';

});

list.addEventListener('dragover', function(e) {
    e.preventDefault(); // Necessary to allow dropping
    const target = e.target.closest('li'); // Ensure we get the LI even if nested elements are targeted
    if (target && target !== draggedItem) {
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2; // Get the vertical mid-point
        if (e.clientY - offset > 0) {
            target.after(draggedItem);
        } else {
            target.before(draggedItem);
        }
    }
});

list.addEventListener('dragend', function(e) {
    // Remove the 'dragging' class
    e.target.classList.remove('dragging');

    // Re-enable hover effects on all items
    navItems.forEach(item => {
        item.classList.remove('dragging');
    });
    draggedItem.style.opacity = '';

    updateNavbarOrder();
});

function updateNavbarOrder() {
    // Log the updated order for demonstration purposes
    console.log("Order updated:", Array.from(list.children).map(item => item.textContent));
    // Implement server call or local storage update here if necessary
}

list.addEventListener('dragenter', function(e) {
    e.preventDefault();
    // Manage the insert position here, without changing styles
});

list.addEventListener('dragleave', function(e) {
    // Optionally manage hover effect here if needed
});

list.addEventListener('drop', function(e) {
    // Drop event logic here
});



