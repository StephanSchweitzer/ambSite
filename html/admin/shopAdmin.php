<?php
session_start();
if (($_SESSION["ambar"] ?? null) != "connected")
{
  header("Location: ../signIn/signIn.php?status=needCredentials");
  die;
}

 ?>
<!DOCTYPE html>
 <html lang="en" dir="ltr">
 <head>
   <!-- IE 11 compatibility -->
   <meta charset="utf-8">
   <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
   <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
     <link rel="stylesheet" href="admin.css">  <!-- Ensure this path is correct -->

   <script src="../js/shopAdminFunctions.js"></script>




   <meta charset="utf-8">
   <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
   <title>Shop Admin page</title>

   <style>
   .card {
     cursor: pointer;
   }

    #worksList
    {
      border: 2px solid #333; /* Solid border with a dark color */
      padding: 10px; /* Padding inside the border */
      list-style-type: none; /* Remove default list bullets */
      max-height: 300px; /* Maximum height of the list */
      overflow-y: auto; /* Scrollbar for overflow content */
      margin: 20px 0; /* Margin around the list */
    }

  </style>
 </head>
 <body>
   <!-- <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script> -->
   <div class="admin-container" style="background-color:white;">
   <div class="container">
     <br>
     <h1 class="display-1" style="text-align:center; color: white">Shop admin page</h1>
     <br>
     <a href="mainAdmin.php"><button type="submit" class="btn btn-info">Main Admin Page</button></a>
    <br><br><br>
    <button type="button" class="btn btn-secondary" onclick="loadAndInsertProducts('active')">See all items for sale</button>
     <button type="button" class="btn btn-secondary" onclick="loadAndInsertProducts('inactive')">See all items not for sale</button>
     <button type="button" class="btn btn-secondary" onclick="loadAndInsertProducts('invisible')">See all deleted items</button>
     <button type="button" class="btn btn-primary" onclick="openPostForm()">Create Shop Item</button>
     <br><br>


   </div>
   <br>
    <div class="">
     <div class="d-inline-flex flex-wrap p-1" style="" id="existingPostInformation">
     </div>
   </div>


   <br><br>
 </div>

      <div id="myToastContainer" style="position: fixed; top: 100px; right: 100px; z-index: 1050;"></div>


   <div class="modal fade" id="productPostModal" tabindex="-1" role="dialog" aria-labelledby="productModalLabel" aria-hidden="true">
     <div class="modal-dialog" role="document">
       <div class="modal-content">
         <div class="modal-header">
           <h5 class="modal-title" id="postModalLabel">Enter corresponding information</h5>
           <button type="button" class="close" data-dismiss="modal" aria-label="Close">
             <span aria-hidden="true">&times;</span>
           </button>
         </div>
         <div class="modal-body">
           <form>
             <div class="form-group">
               <label for="productName">Name</label>
               <input type="text" class="form-control" id="productName" >
             </div>

             <div class="form-group">
               <label for="shopifyCode">Code from shopify here</label>
               <textarea class="form-control" aria-label="With textarea" id="shopifyCode"></textarea>
             </div>

             <div class="form-group">
               <label>Is this for sale right now ?</label>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isActivePost" id="activeYesPost" value="true">
                 <label class="form-check-label" for="activeYesPost">Active</label>
               </div>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isActivePost" id="activeNoPost" value="false">
                 <label class="form-check-label" for="activeNoPost">Inactive</label>
               </div>
             </div>

             <div class="form-group">
               <label for="postOrderOfDisplay">Display Order / Position</label>
               <input type="text" class="form-control" id="postOrderOfDisplay" >
             </div>

           </form>
         </div>
         <div class="modal-footer">
           <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
           <button id="uploadProductButton" type="button" class="btn btn-primary" onclick="createProduct()">Upload Item</button>
         </div>
       </div>
     </div>
   </div>

    <div class="modal fade" id="productUpdateModal" tabindex="-1" role="dialog" aria-labelledby="productModalLabel" aria-hidden="true">
     <div class="modal-dialog" role="document">
       <div class="modal-content">
         <div class="modal-header">
           <h5 class="modal-title" id="productModalLabel">Shop Item Information</h5>
           <button type="button" class="close" data-dismiss="modal" aria-label="Close">
             <span aria-hidden="true">&times;</span>
           </button>
         </div>
         <div class="modal-body">
           <form>
             <div class="form-group">
               <input type="hidden" class="form-control" id="productId" >
             </div>

             <div class="form-group">
               <label for="editProductName">Name</label>
               <input type="text" class="form-control" id="editProductName" >
             </div>

             <div class="form-group">
               <label for="editShopifyCode">Code from shopify here</label>
               <textarea class="form-control" aria-label="With textarea" id="editShopifyCode"></textarea>
             </div>

             <div class="form-group">
               <label>Is this item for sale right now ?</label>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="editIsActivePost" id="editActiveYesPost" value="true">
                 <label class="form-check-label" for="editActiveYesPost">Active</label>
               </div>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="editIsActivePost" id="editActiveNoPost" value="false">
                 <label class="form-check-label" for="editActiveNoPost">Inactive</label>
               </div>
             </div>

             <div class="form-group">
               <label for="editOrderOfDisplay">Display Order / Position</label>
               <input type="text" class="form-control" id="editOrderOfDisplay" >
             </div>

           </form>
         </div>
         <div class="modal-footer">
           <div id="deleteOrRestore">
             <button  type="button" class="btn btn-danger" onclick="deleteProduct()">Delete Item</button>
           </div>
           <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
           <button type="button" class="btn btn-primary" onclick="updateProduct()">Save Changes</button>
         </div>
       </div>
     </div>
   </div>

   <div id="errorToast" class="toast bg-danger text-white" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
  <div class="toast-body">
    <strong>Error:</strong> There was a problem processing your request.
  </div>
</div>

<div id="successToast" class="toast" role="alert" aria-live="polite" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
  <div class="toast-body">Works added to the project</div>
</div>

<!-- Flexbox container for aligning the toasts -->
<div aria-live="polite" aria-atomic="true" class="d-flex justify-content-center align-items-center" style="min-height: 200px;">

  <!-- Then put toasts within -->
  <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="toast-header">
      <strong class="mr-auto">Bootstrap</strong>
      <small>11 mins ago</small>
      <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="toast-body">
      Hello, world! This is a toast message.
    </div>
  </div>
</div>

<!-- Modal -->

<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script type="text/javascript">
document.addEventListener("DOMContentLoaded", function() {
  loadAndInsertProducts('active');
});
</script>

 <script src="../js/adminSession.js"></script>
</body>
 </html>
