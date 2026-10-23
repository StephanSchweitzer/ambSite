var pageNumber = 'active';
var openProductVisible = 1; // whether the item open in the edit window is live or deleted

$( document ).ready(function()
{
	//loadAndInsertProducts('active');
});

function loadAndInsertProducts(activity)
{
	pageNumber = activity;
	yearData = { activity: activity }
	$.ajax({
		url: "../actions/shopAPI.php",
		type: "GET",
		data: yearData,
		dataType: "json",
		success: function(data) {
			console.log(data);
			insertData(data);
		},
		error: function() {
			console.log("An error occurred.");
		},
	});
}

function insertData(data)
{
	let items = data;

	$('#existingPostInformation').empty();

	items.forEach(function(item) {
		let id = item.id;
		let name = item.name;
		let productOrder = item.productOrder;
		let available = item.available;
		let buttonCode = item.buttonCode;
		let visible = item.visible;

    // Create a Bootstrap card div element with the data
		let card = $('<div>').addClass('card shadow-grow mb-4 maxMinWidth15vw');
		let cardBody = $('<div>').addClass('card-body');
		$('<h5>').addClass('card-title').text(name).appendTo(cardBody);
		$('<p>').addClass('card-text').text('ID: ' + id).appendTo(cardBody);
		$('<p>').addClass('card-text').text('For sale right now: ' + available).appendTo(cardBody);
		$('<p>').addClass('card-text').text('Order of display: ' + productOrder).appendTo(cardBody);

		card.append(cardBody);

    // Add padding to the card
		card.css('padding', '20px');

    // Add mouse-over hover effect
		card.hover(
			function() {
				$(this).addClass('shadow-lg');
			},
			function() {
				$(this).removeClass('shadow-lg');
			}
			);

    // Open modal with inputs filled when the photo is clicked
		card.click(function() {
			openProductInfo(id, name, productOrder, available, buttonCode, visible);
		});

    // Append the card to the existingPhotoInformation element
		$('#existingPostInformation').append(card);
	});
}

function openProductInfo(id, name, productOrder, available, buttonCode, visible) {
	openProductVisible = visible == 0 ? 0 : 1;
	document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-danger" onclick="deleteProduct()">Delete Item</button>';

	if (visible == 0)
	{
		document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-info" onclick="restoreProduct()">Restore Item</button>';
	}

	var openActiveYes = document.getElementById('editActiveYesPost');
	var openActiveNo = document.getElementById('editActiveNoPost');

  // Set the values of the modal inputs
	$('#productId').val(id);
	$('#editProductName').val(name);
	$('#editShopifyCode').val(buttonCode);
	$('#editOrderOfDisplay').val(productOrder);


	if (available == 1)
	{
		openActiveYes.checked = true;
	}
	else
	{
		openActiveNo.checked = true;
	}

  // Open the Bootstrap modal
	$('#productUpdateModal').modal('show');
}

function openPostForm()
{
	$("#productPostModal").modal('show');
}

function createProduct() {

  let isActiveProduct = $('input[name=isActivePost]:checked').val(); // Retrieve the selected radio button value


  let productInt = 1;

  if (isActiveProduct != 'true')
  {
  	productInt = 0;
  }

  var postData = new FormData();
  postData.append('name', $('#productName').val());
  postData.append('productOrder', $('#postOrderOfDisplay').val());
  postData.append('available', productInt);
  postData.append('buttonCode', $('#shopifyCode').val());
  postData.append('visible', 1);

  document.getElementById('uploadProductButton').disabled = true;

  $.ajax({
  	url: '../actions/shopAPI.php',
  	type: 'POST',
  	data: postData,
  	processData: false,
  	contentType: false,
  	success: function(response) {
  		console.log('Data saved successfully!');
  		loadAndInsertProducts(pageNumber);
		  showToast('Shop item successfully created', 'success');

  		$('#productPostModal').modal('hide');
  		$('#productPostModal form')[0].reset();
  		document.getElementById('uploadProductButton').disabled = false;
  	},
  	error: function(xhr, status, error) {
  		console.error('Error:', error);
		  showToast('There was an error', 'error');

  		document.getElementById('uploadProductButton').disabled = false;
  	}
  });
}

function updateProduct()
{
  // Get the form data

  let isActive = $('input[name=editIsActivePost]:checked').val(); // Retrieve the selected radio button value

  let activeInt = 1;

  if (isActive != 'true')
  {
  	activeInt = 0;
  }

  var formData = {
  	id: $('#productId').val(),
  	name: $('#editProductName').val(),
  	buttonCode: $('#editShopifyCode').val(),
  	productOrder: $('#editOrderOfDisplay').val(),
  	available : activeInt,
  	// Saving keeps a deleted item deleted; only Restore brings it back
  	visible : openProductVisible
  };

  // Send the form data via AJAX
  $.ajax({
  	url: '../actions/shopAPI.php',
  	type: 'PATCH',
  	data: formData,
  	success: function(response) {

  		loadAndInsertProducts(pageNumber);
        showToast('Shop item successfully updated', 'success');

  		console.log('Data updated successfully!');
  		console.log(formData);
  		$('#productUpdateModal').modal('hide');

      // You can perform additional actions here
  	},
  	error: function(xhr, status, error) {
      // Handle the error response
        showToast('There has been a problem saving this item', 'error');
  		console.error('Error:', error);
      // You can perform error handling here
  	}
  });
}

function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('myToastContainer');
  const toast = document.createElement('div');
  toast.className = 'myToast'; // Base class
  toast.textContent = message;

  // Apply styles directly
  toast.style.color = '#fff';
  toast.style.backgroundColor = '#25252f';
  toast.style.border = '1px solid #ddd';
  toast.style.borderLeft = '15px solid #00b894';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
  toast.style.width = '300px';
  toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  toast.style.transform = 'translateX(100%)';
  toast.style.opacity = '0';

  // Setting background color based on the type of message
  switch (type) {
      case 'success':
          toast.style.borderLeftColor = '#2ecc71'; // Green for success
          break;
      case 'error':
          toast.style.borderLeftColor = '#e74c3c'; // Red for error
          break;
      default:
          toast.style.borderLeftColor = '#3498db'; // Blue for general info
  }

  // Append the toast to the container
  toastContainer.appendChild(toast);
  setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
  }, 100); // Delay to allow CSS transition

  // Automatically remove the toast
  setTimeout(() => {
      toastContainer.removeChild(toast);
  }, 5000); // Display for 4 seconds
}

function deleteProduct()
{
	{
		var formData = {
			id: $('#productId').val(),
		};
		$.ajax({
			url: '../actions/shopAPI.php',
			type: 'DELETE',
			data: formData,
			success: function(response) {
				loadAndInsertProducts(pageNumber)
				showToast('Shop item successfully deleted', 'success');
				$('#productUpdateModal').modal('hide');
			},
			error: function(xhr, status, error) {
        		showToast('There was an error', 'error');
				console.error('Error:', error);
			}
		});
	}
}

function restoreProduct()
{

	let isAvailable = $('input[name=editIsActivePost]:checked').val(); // Retrieve the selected radio button value

	let availableInt = 1;

	if (isAvailable != 'true')
	{
		availableInt = 0;
	}

	var formData = {
		id: $('#productId').val(),
		name: $('#editProductName').val(),
		buttonCode: $('#editShopifyCode').val(),
		productOrder: $('#editOrderOfDisplay').val(),
		available : availableInt,
		visible : 1
	};

	$.ajax({
		url: '../actions/shopAPI.php',
		type: 'PATCH',
		data: formData,
		success: function(response) {
			loadAndInsertProducts('invisible')
			showToast('Shop item successfully restored', 'success');
			$('#productUpdateModal').modal('hide');
		},
		error: function(xhr, status, error) {
			showToast('There has been a problem restoring this item', 'error');
			console.error('Error:', error);
		}
	});
}