<?php
session_start();
if ($_SESSION["ambar"] != "connected")
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

   <script src="../js/photoAdminFunctions.js"></script>




   <meta charset="utf-8">
   <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
   <title>Picture Admin page</title>

   <style>
   .card {
     cursor: pointer;
   }
  </style>
 </head>
 <body>
   <!-- <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script> -->

   <div class="container" style="background-color:white;">
     <br>
     <h1 class="display-1 text-primary" style="text-align:center;">Picture admin page</h1>
     <br>
     <a href="mainAdmin.php"><button type="submit" class="btn btn-primary">Main Admin Page</button></a>

     <br><br>
   </div>


   <div class="container" style="background-color:white;">
     <br>
     <button type="button" class="btn btn-primary" onclick="getAllWorks(0)">See all active works</button>
     <button type="button" class="btn btn-primary" onclick="getAllWorks('invisible')">See Deleted Works</button>
     <button type="button" class="btn btn-primary" onclick="openPostForm()">Post Work</button>
     <br><br>

     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Fixed Motion')">Fixed Motion</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Tape Diaries')">Tape Diaries</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Force')">Force</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Drip')">Drip</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Where is my mind?')">Where is my mind?</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Portraits')">Portraits</button>

     <br><br>

     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('2020')">2019/2020</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('2022')">2021/2022</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('2023')">2023</button>

     <br><br>

     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Leaves / Petals')">Leaves / Petals</button>

     <br><br>

     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Mise en scene')">Mise en scene</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Paris')">Paris</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('In conversation with a flower')">In conversation with a flower</button>
     <button type="button" name="button" class="btn btn-primary" onclick="getAllWorks('Recyclart')">Recyclart</button>
     <br><br>
   </div>

   <div class="container" style="background-color:white;">
     <div class="d-inline-flex flex-wrap p-2" style="" id="existingPhotoInformation">
     </div>
   </div>

     <br><br>
   </div>


   <div class="modal fade" id="photoUpdateModal" tabindex="-1" role="dialog" aria-labelledby="photoModalLabel" aria-hidden="true">
     <div class="modal-dialog" role="document">
       <div class="modal-content">
         <div class="modal-header">
           <h5 class="modal-title" id="photoModalLabel">Photo Information</h5>
           <button type="button" class="close" data-dismiss="modal" aria-label="Close">
             <span aria-hidden="true">&times;</span>
           </button>
         </div>
         <div class="modal-body">
           <form>
             <div class="form-group">
               <input type="hidden" class="form-control" id="photoId" >
             </div>
             <!-- <div class="form-group">
               <label for="photoLocation">Location</label>
               <input type="text" class="form-control" id="photoLocation" >
             </div> -->
             <div class="form-group">
               <label for="photoName">Name</label>
               <input type="text" class="form-control" id="photoName" >
             </div>
             <div class="form-group">
               <label for="photoFirstDescription">First Description</label>
               <input type="text" class="form-control" id="photoFirstDescription" >
             </div>
             <div class="form-group">
               <label for="photoSecondDescription">Second Description</label>
               <input type="text" class="form-control" id="photoSecondDescription" >
             </div>

             <div class="form-group">
               <label for="photoMedium">Medium</label>
               <select class="form-select" id="photoMedium">
                <option value="Fixed Motion">Fixed Motion</option>
                <option value="Tape Diaries">Tape Diaries</option>
                <option value="Force">Force</option>
                <option value="Drip">Drip</option>
                <option value="Where is my mind?">Where is my mind?</option>
                <option value="Portraits">Portraits</option>
                <option value="Leaves / Petals">Leaves / Petals</option>
                <option value="Illustration">Illustration</option>
                <option value="Mise en scene">Mise en scene</option>
                <option value="Paris">Paris</option>
                <option value="In conversation with a flower">In conversation with a flower</option>
                <option value="Recyclart">Recyclart</option>
                <option value="Bio">Bio</option>
                <option value="Contact">Contact</option>
                <option value="CV">CV</option>
              </select>
             </div>

             <!-- <div class="form-group">
               <label for="photoIsColor">Is Color</label>
               <input type="text" class="form-control" id="photoIsColor" >
             </div> -->

             <div class="form-group">
               <label>Is the photo black and white or color?</label>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isColorEdit" id="colorYesEdit" value="true">
                 <label class="form-check-label" for="colorYesEdit">Color</label>
               </div>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isColorEdit" id="colorNoEdit" value="false">
                 <label class="form-check-label" for="colorNoEdit">Black and White</label>
               </div>
             </div>

             <!-- <div class="form-group">
               <label for="photoAvailability">Availability</label>
               <input type="text" class="form-control" id="photoAvailability" >
             </div> -->

             <div class="form-group">
               <label>Is this piece available for sale?</label>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isAvailableEdit" id="availableYesEdit" value="true">
                 <label class="form-check-label" for="availableYesEdit">Available</label>
               </div>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isAvailableEdit" id="availableNoEdit" value="false">
                 <label class="form-check-label" for="availableNoEdit">Unavailable</label>
               </div>
             </div>

             <div class="form-group">
              <label>Include this image in the carousel?</label>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="isCarouselEdit" id="carouselYesEdit" value="true">
                <label class="form-check-label" for="carouselYesEdit">Include</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="isCarouselEdit" id="carouselNoEdit" value="false">
                <label class="form-check-label" for="carouselNoEdit">Don't include</label>
              </div>
            </div>

             <div class="form-group">
               <label for="photoCreationYear">Creation Year</label>
               <input type="text" class="form-control" id="photoCreationYear" >
             </div>

             <div class="form-group">
               <label for="photoCreationYear">Display Order / Position</label>
               <input type="text" class="form-control" id="updateOrderOfDisplay" >
             </div>

           </form>
         </div>
         <div class="modal-footer">
           <div id="deleteOrRestore">
             <button  type="button" class="btn btn-danger" onclick="deleteWork()">Delete post</button>
           </div>
           <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
           <button type="button" class="btn btn-primary" onclick="updateWork()">Save Changes</button>
         </div>
       </div>
     </div>
   </div>

   <div class="modal fade" id="photoPostModal" tabindex="-1" role="dialog" aria-labelledby="photoModalLabel" aria-hidden="true">
     <div class="modal-dialog" role="document">
       <div class="modal-content">
         <div class="modal-header">
           <h5 class="modal-title" id="photoModalLabel">Enter corresponding information</h5>
           <button type="button" class="close" data-dismiss="modal" aria-label="Close">
             <span aria-hidden="true">&times;</span>
           </button>
         </div>
         <div class="modal-body">
           <form>
             <label for="photoUpload" class="required">Photo</label>
             <div class="input-group">
               <div class="custom-file">

                 <input class="form-control" type="file"  accept="image/*" name="photoPostUpload" id="photoPostUpload">

               </div>
             </div>
             <div class="form-group">
               <label for="photoName">Name</label>
               <input type="text" class="form-control" id="photoPostName" >
             </div>
             <div class="form-group">
               <label for="photoFirstDescription">First Description</label>
               <input type="text" class="form-control" id="photoPostFirstDescription" >
             </div>
             <div class="form-group">
               <label for="photoSecondDescription">Second Description</label>
               <input type="text" class="form-control" id="photoPostSecondDescription" >
             </div>
             <div class="form-group">
               <label for="photoPostMedium">Medium</label>
               <select class="form-select" id="photoPostMedium">
                <option value="Fixed Motion">Fixed Motion</option>
                <option value="Tape Diaries">Tape Diaries</option>
                <option value="Force">Force</option>
                <option value="Drip">Drip</option>
                <option value="Where is my mind?">Where is my mind?</option>
                <option value="Portraits">Portraits</option>
                <option value="Leaves / Petals">Leaves / Petals</option>
                <option value="Illustration">Illustration</option>
                <option value="Mise en scene">Mise en scene</option>
                <option value="Paris">Paris</option>
                <option value="In conversation with a flower">In conversation with a flower</option>
                <option value="Recyclart">Recyclart</option>
                <option value="Bio">Bio</option>
                <option value="Contact">Contact</option>
                <option value="CV">CV</option>
              </select>
             </div>

             <div class="form-group">
               <label>Is the photo black and white or color?</label>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isColorPost" id="colorYesPost" value="true">
                 <label class="form-check-label" for="colorYesPost">Color</label>
               </div>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isColorPost" id="colorNoPost" value="false">
                 <label class="form-check-label" for="colorNoPost">Black and White</label>
               </div>
             </div>

             <!-- <div class="form-group">
               <label for="photoAvailability">Availability</label>
               <input type="text" class="form-control" id="photoAvailability" >
             </div> -->

             <div class="form-group">
               <label>Is this piece available for sale?</label>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isAvailablePost" id="availableYesPost" value="true">
                 <label class="form-check-label" for="availableYesPost">Available</label>
               </div>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isAvailablePost" id="availableNoPost" value="false">
                 <label class="form-check-label" for="availableNoPost">Unavailable</label>
               </div>
             </div>

             <div class="form-group">
               <label>Include this image in the carousel?</label>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isCarouselPost" id="carouselYesPost" value="true">
                 <label class="form-check-label" for="carouselYesPost">Include</label>
               </div>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isCarouselPost" id="carouselNoPost" value="false">
                 <label class="form-check-label" for="carouselNoPost">Don't include</label>
               </div>
             </div>

             <div class="form-group">
               <label for="photoCreationYear">Creation Year</label>
               <input type="text" class="form-control" id="photoPostCreationYear" >
             </div>

             <div class="form-group">
               <label for="photoCreationYear">Display Order / Position</label>
               <input type="text" class="form-control" id="postOrderOfDisplay" >
             </div>

           </form>
         </div>
         <div class="modal-footer">
           <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
           <button id="uploadWorkButton" type="button" class="btn btn-primary" onclick="postPhoto()">Upload Work</button>
         </div>
       </div>
     </div>
   </div>

   <div id="errorToast" class="toast bg-danger text-white" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
  <div class="toast-body">
    <strong>Error:</strong> There was a problem processing your request.
  </div>
</div>

<!-- Modal -->

<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script type="text/javascript">
document.addEventListener("DOMContentLoaded", function() {
  getAllWorks(0);
});
</script>

 </body>
 </html>
