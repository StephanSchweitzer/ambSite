function updateLinks()
{
    return
}

const list = document.getElementById('navbar');

let draggedItem = null;

list.addEventListener('dragstart', function(e) {
    draggedItem = e.target;
    // Add the 'dragging' class to signify an item is being dragged
    e.target.classList.add('dragging');
});

list.addEventListener('dragover', function(e) {
    e.preventDefault(); // Necessary to allow dropping
    const target = e.target.closest('li'); // Ensure we get the LI even if nested elements are targeted
    if (target && target !== draggedItem) {
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2; // Get the vertical mid-point
        if (e.clientY - offset > 0) {
            // If dragging below the midpoint, insert after the target item
            target.after(draggedItem);
        } else {
            // If dragging above the midpoint, insert before the target item
            target.before(draggedItem);
        }
    }
});

list.addEventListener('dragend', function(e) {
    // Remove the 'dragging' class to signify dragging has ended
    e.target.classList.remove('dragging');
    // Reapply hover styles if needed
    Array.from(list.children).forEach(item => item.classList.remove('hover'));
    updateNavbarOrder();
});

function updateNavbarOrder() {
    // This function would typically send the new order to the server or save it locally
    console.log("Order updated:", Array.from(list.children).map(item => item.textContent));
    // Remember to implement your server call or local storage update here
}


list.addEventListener('dragenter', function(e) {
    e.preventDefault();
    // Only manage the insert position here, without changing styles
});

list.addEventListener('dragleave', function(e) {
    // Remove hover effect when dragging out of an item
    if (e.target === draggedItem) {
        e.target.classList.remove('hover');
    }
});

list.addEventListener('drop', function(e) {
    // Drop event logic here
});


