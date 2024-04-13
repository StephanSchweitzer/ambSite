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
   <link rel="stylesheet" href="admin.css">

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

   <div class="admin-container" style="background-color:white;">
     <br>
     <div class="container">
     <h1 class="display-1" style="text-align:center; color:white">Picture admin page</h1>
     <br>
     <a href="mainAdmin.php"><button type="submit" class="btn btn-info">Main Admin Page</button></a>

     <br><br>


     <br>
    <button type="button" class="btn btn-secondary" onclick="getAllWorks('Select Works')">See all selected works</button>
     <button type="button" class="btn btn-secondary" onclick="getAllWorks(0)">See all unselected works</button>
     <button type="button" class="btn btn-dark" onclick="getAllWorks('invisible')">See Deleted Works</button>
     <button type="button" class="btn btn-primary" onclick="openPostForm()">Post Work</button>
     <br><br>
     <select id="projectsDropdown"></select>
     </div>
     <br><br>
     <div class="d-inline-flex flex-wrap p-2" style="" id="existingPhotoInformation">
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
               <!-- <input type="text" class="form-control" id="photoFirstDescription" > -->
               <textarea class="form-control" aria-label="With textarea" id="photoFirstDescription"></textarea>
             </div>
             <div class="form-group">
               <label for="photoSecondDescription">(Optional for you) Second Description</label>
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
              <label>Include this image in "Select Works" ?</label>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="isSelectWorksEdit" id="selectWorksYesEdit" value="true">
                <label class="form-check-label" for="selectWorksYesEdit">Include</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="isSelectWorksEdit" id="selectWorksNoEdit" value="false">
                <label class="form-check-label" for="selectWorksNoEdit">Don't include</label>
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
             <label for="photoPostUpload" class="required">Photo</label>
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
               <textarea class="form-control" aria-label="With textarea" id="photoPostFirstDescription"></textarea>
               <!-- <input type="text" class="form-control" id="photoPostFirstDescription" > -->
             </div>

             <div class="form-group">
               <label for="photoSecondDescription">(Optional for you) Second Description</label>
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
               <label>Include this image in Select Works?</label>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isSelectWorksPost" id="selectWorksYesPost" value="true">
                 <label class="form-check-label" for="selectWorksYesPost">Include</label>
               </div>
               <div class="form-check">
                 <input class="form-check-input" type="radio" name="isSelectWorksPost" id="selectWorksNoPost" value="false">
                 <label class="form-check-label" for="selectWorksNoPost">Don't include</label>
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

   <div id="myToastContainer" style="position: fixed; top: 100px; right: 100px; z-index: 1050;"></div>


<!-- Modal -->

<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script type="text/javascript">
document.addEventListener("DOMContentLoaded", function() {
  getAllWorks('Select Works');
});
</script>

 </body>
 </html>
