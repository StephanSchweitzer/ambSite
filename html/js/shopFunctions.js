var pageNumber = 'active';

$( document ).ready(function()
{
	loadShop();
});

function loadShop(activity)
{
	pageNumber = activity;
	yearData = { activity: activity }
	$.ajax({
		url: "../actions/projectsAPI.php",
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

function deleteProduct(id)
{

}

function updateProduct(id)
{

}

function createProduct()
{

}

function insertData(data)
{
	let items = data;

	$('#existingPostInformation').empty();

	items.forEach(function(item) {
		let id = item.id;
		let name = item.name;
		let order = item.order;
		let available = item.available;
		let buttonCode = item.buttonCode;

    // Create a Bootstrap card div element with the data
		let card = $('<div>').addClass('card shadow-grow mb-4');
		let cardBody = $('<div>').addClass('card-body');
		$('<h5>').addClass('card-title').text(name).appendTo(cardBody);
		$('<p>').addClass('card-text').text('ID: ' + id).appendTo(cardBody);
		$('<p>').addClass('card-text').text('For sale right now: ' + available).appendTo(cardBody);
		$('<p>').addClass('card-text').text('Order of display: ' + orderOfDisplay).appendTo(cardBody);

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
			openProductInfo(id, name, order, available, buttonCode);
		});

    // Append the card to the existingPhotoInformation element
		$('#existingPostInformation').append(card);
	});
}

function openProjectInfo(id, name, order, available, buttonCode) {
	document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-danger" onclick="deleteProduct()">Delete Project</button>';

	if (available == 0)
	{
		document.getElementById('deleteOrRestore').innerHTML = '<button  type="button" class="btn btn-info" onclick="restoreProduct()">Restore post</button>';
	}

	var openActiveYes = document.getElementById('editActiveYesPost');
	var openActiveNo = document.getElementById('editActiveNoPost');

  // Set the values of the modal inputs
	$('#productId').val(id);
	$('#editProductName').val(name);
	$('#editShopifyCode').val(buttonCode);
	$('#editOrderOfDisplay').val(orderOfDisplay);


	if (available == 1)
	{
		openActiveYes.checked = true;
	}
	else
	{
		openActiveNo.checked = true;
	}

  // Open the Bootstrap modal
	$('#projectUpdateModal').modal('show');
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
  postData.append('order', $('#postOrderOfDisplay').val());
  postData.append('available', productInt);
  postData.append('buttonCode', $('#postOrderOfDisplay').val());


  document.getElementById('uploadProductButton').disabled = true;

  $.ajax({
  	url: '../actions/shopAPI.php',
  	type: 'POST',
  	data: postData,
  	processData: false,
  	contentType: false,
  	success: function(response) {
  		console.log('Data saved successfully!');
  		loadShop(pageNumber);
  		$('#productPostModal').modal('hide');
  		document.getElementById('uploadProductButton').disabled = false;
  	},
  	error: function(xhr, status, error) {
  		console.error('Error:', error);
  		document.getElementById('uploadProductButton').disabled = false;
  	}
  });
}

function updateWork()
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
  	orderOfDisplay: $('#editOrderOfDisplay').val(),
  	active : activeInt
  };

  console.log(formData);
  // Send the form data via AJAX
  $.ajax({
  	url: '../actions/shopAPI.php',
  	type: 'PATCH',
  	data: formData,
  	success: function(response) {

  		loadShop(pageNumber);

  		console.log('Data updated successfully!');
  		console.log(formData);
  		$('#productUpdateModal').modal('hide');

      // You can perform additional actions here
  	},
  	error: function(xhr, status, error) {
      // Handle the error response
  		$('#errorToast').toast('show');
  		console.error('Error:', error);
      // You can perform error handling here
  	}
  });
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
				loadShop(pageNumber)
				$('#productUpdateModal').modal('hide');
			},
			error: function(xhr, status, error) {
				$('#errorToast').toast('show');
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
		orderOfDisplay: $('#editOrderOfDisplay').val(),
		available : availableInt
	};

	$.ajax({
		url: '../actions/projectsAPI.php',
		type: 'PATCH',
		data: formData,
		success: function(response) {
			getProjects('invisible')
			$('#projectUpdateModal').modal('hide');
		},
		error: function(xhr, status, error) {
			$('#errorToast').toast('show');
			console.error('Error:', error);
		}
	});
}