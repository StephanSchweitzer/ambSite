function showSpinner() {
    const spinnerHtml = `
        <div id="loadingSpinner" class="d-flex justify-content-center align-items-center" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; background: rgba(255, 255, 255, 0.8);">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
            </div>
        </div>
    `;
    $('#imagesAndContent').css('position', 'relative').append(spinnerHtml);
}

function hideSpinner() {
    $('#loadingSpinner').remove();
}

function loadShop()
{
	showSpinner()
	yearData = { activity: 'active' }
	$.ajax({
		url: "../actions/shopAPI.php",
		type: "GET",
		data: yearData,
		dataType: "json",
		success: function(data) {
			//spinner.style.display = 'block';
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
			hideSpinner()

			history.pushState({page: 'shop'}, 'Shop', '/shop');
  			document.title = 'Shop - Ambar Velasco';
		},
		error: function() {
			console.log("An error occurred.");
		},
	});
}

function parseScriptsInHtml(html) {
	var tempDiv = document.createElement('div');
	tempDiv.innerHTML = html;
	Array.from(tempDiv.querySelectorAll('script')).forEach(oldScript => {
		var newScript = document.createElement('script');
		Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
		newScript.appendChild(document.createTextNode(oldScript.innerHTML));
		oldScript.parentNode.replaceChild(newScript, oldScript);
	});
}

function createShopItem(item) {
    // Create the main .shopItem div
	var shopItemDiv = $('<div>').addClass('shopItem');

    // Create and append the image
    //$('<img>').attr('src', item.imageSrc).attr('alt', item.description).appendTo(shopItemDiv);

    // Create and append the item details div
	var itemDetailsDiv = $('<div>').addClass('item-details');
    // Add item details content here, e.g., title and price
    //$('<h3>').text(item.title).appendTo(itemDetailsDiv);
    //#('<p>').text(`€${item.price}`).appendTo(itemDetailsDiv);
    //itemDetailsDiv.appendTo(shopItemDiv);

    // Create and append the buy button div
	var buyButtonDiv = $('<div>').addClass('buy-button').html(item.buttonCode);
	buyButtonDiv.appendTo(shopItemDiv);

    // Return the complete shopItem
	return shopItemDiv;
}