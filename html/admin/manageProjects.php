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

 <script src="../js/projectAdminFunctions.js"></script>




 <meta charset="utf-8">
 <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
 <title>Project Admin page</title>

 <style>
   .card {
     cursor: pointer;
   }

   #worksList {
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
     <h1 class="display-1" style="text-align:center; color: white;">Project admin page</h1>
     <br>
     <a href="mainAdmin.php"><button type="submit" class="btn btn-info">Main Admin Page</button></a>

     <br><br>
     <br>
     <button type="button" class="btn btn-secondary" onclick="getProjects('active')">See all active projects</button>
     <button type="button" class="btn btn-secondary" onclick="getProjects('inactive')">See all inactive projects</button>
     <button type="button" class="btn btn-dark" onclick="getProjects('deleted')">See deleted projects</button>
     <button type="button" class="btn btn-primary" onclick="openPostForm()">Create project</button>
     <br><br>

   </div>
   <br><br>
   <div class="container ">
     <div class="projectCardContainer" style="" id="existingPostInformation">
     </div>
   </div>


   <br><br>
 </div>


 <div class="modal fade" id="projectPostModal" tabindex="-1" role="dialog" aria-labelledby="projectModalLabel" aria-hidden="true">
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
             <label for="titlePostName">Title</label>
             <input type="text" class="form-control" id="titlePostName" >
           </div>

           <div class="form-group">
             <label for="projectDescription">Project Description</label>
             <textarea class="form-control" aria-label="With textarea" id="projectDescription"></textarea>
           </div>

           <div class="form-group">
             <label>Is this project active ?</label>
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
         <button id="uploadWorkButton" type="button" class="btn btn-primary" onclick="createProject()">Upload Work</button>
       </div>
     </div>
   </div>
 </div>

 <div class="modal fade" id="projectUpdateModal" tabindex="-1" role="dialog" aria-labelledby="projectModalLabel" aria-hidden="true">
   <div class="modal-dialog" role="document">
     <div class="modal-content">
       <div class="modal-header">
         <h5 class="modal-title" id="projectModalLabel">Project Information</h5>
         <button type="button" class="close" data-dismiss="modal" aria-label="Close">
           <span aria-hidden="true">&times;</span>
         </button>
       </div>
       <div class="modal-body">
         <form>
           <div class="form-group">
             <input type="hidden" class="form-control" id="projectId" >
           </div>

           <div class="form-group">
             <label for="editProjectTitle">Title</label>
             <input type="text" class="form-control" id="editProjectTitle" >
           </div>

           <div class="form-group">
             <label for="editProjectDescription">Project Description</label>
             <textarea class="form-control" aria-label="With textarea" id="editProjectDescription"></textarea>
           </div>

           <div class="form-group">
             <label>Is this project active ?</label>
             <div class="form-check">
               <input class="form-check-input" type="radio" name="editIsActivePost" id="editActiveYesPost" value="true">
               <label class="form-check-label" for="editActiveYesPost">Active</label>
             </div>
             <div class="form-check">
               <input class="form-check-input" type="radio" name="editIsActivePost" id="editActiveNoPost" value="false">
               <label class="form-check-label" for="editActiveNoPost">Inactive</label>
             </div>
           </div>

           <br>

           <div id="worksInProject">
            <ul id="worksList"></ul>

<!--            <button type="button" id="addWork" onclick="addWorksToProject()">Update Works</button>-->
          </div>

          <br>
          <br>

          <div class="form-group">
           <label for="editOrderOfDisplay">Display Order / Position</label>
           <input type="text" class="form-control" id="editOrderOfDisplay" >
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

   <div id="myToastContainer" style="position: fixed; top: 100px; right: 100px; z-index: 1050;"></div>


<!-- Modal -->

<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script type="text/javascript">
  document.addEventListener("DOMContentLoaded", function() {
    getProjects('active');
  });
</script>

</body>
</html>
