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
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="admin.css">
    <link rel="stylesheet" href="newsletterAdmin.css">
    <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
    <title>Newsletter Admin Page</title>
</head>
<body>

<div class="admin-container" style="align-content: center;">
    <div class="container">
        <br>
        <h1 class="display-1" style="text-align:center; color: white;">Newsletter Admin</h1>
        <br>
        <a href="mainAdmin.php"><button type="button" class="btn btn-info">Main Admin Page</button></a>
        <br>
        <br>
    </div>
    <br>
    <div style="max-width: 85vw; margin: 0 auto;">
        <div class="content-box" style="color: white; padding: 20px;">

            <!-- Dashboard Stats -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="stat-card">
                        <h3 id="totalSubscribers">0</h3>
                        <p>Total Subscribers</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card">
                        <h3 id="activeSubscribers">0</h3>
                        <p>Active Subscribers</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card">
                        <h3 id="inactiveSubscribers">0</h3>
                        <p>Inactive Subscribers</p>
                    </div>
                </div>
            </div>

            <!-- Search and Filter Controls -->
            <div class="row mb-3">
                <div class="col-md-8">
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                        </div>
                        <input type="text" id="searchInput" class="form-control" placeholder="Search emails...">
                    </div>
                </div>
                <div class="col-md-4">
                    <select id="statusFilter" class="form-control">
                        <option value="all">All Subscribers</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>
            </div>

            <!-- Subscribers Table -->
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Email Address</th>
                        <th scope="col">Subscription Date</th>
                        <th scope="col">Status</th>
                        <th scope="col">Actions</th>
                    </tr>
                    </thead>
                    <tbody id="subscribersList">
                    <!-- Table rows will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <nav aria-label="Subscription pagination">
                <ul id="pagination" class="pagination justify-content-center">
                    <!-- Pagination will be populated by JavaScript -->
                </ul>
            </nav>

            <!-- Export Button -->
            <div class="mt-3 text-right">
                <button id="exportEmailList" class="btn btn-info mr-2">
                    <i class="fas fa-copy"></i> Export Email List (Copy/Paste Format)
                </button>
                <button id="exportCSV" class="btn btn-success">
                    <i class="fas fa-file-export"></i> Export to CSV
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Edit Subscriber Modal -->
<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="editModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="editModalLabel">Edit Subscriber</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="editForm">
                    <input type="hidden" id="editId">
                    <div class="form-group">
                        <label for="editEmail">Email Address</label>
                        <input type="email" class="form-control" id="editEmail" required>
                    </div>
                    <div class="form-group">
                        <div class="custom-control custom-switch">
                            <input type="checkbox" class="custom-control-input" id="editActive">
                            <label class="custom-control-label" for="editActive">Active</label>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="saveEdit">Save Changes</button>
            </div>
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteModal" tabindex="-1" role="dialog" aria-labelledby="deleteModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="deleteModalLabel">Confirm Deletion</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this subscription?</p>
                <p><strong id="deleteEmailText"></strong></p>
                <input type="hidden" id="deleteId">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="emailListModal" tabindex="-1" role="dialog" aria-labelledby="emailListModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="emailListModalLabel">Copy-Paste Email List</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <p>Below is a comma-separated list of all subscriber emails. Click "Copy to Clipboard" to copy this list.</p>
                <div class="form-group">
                    <textarea id="emailListText" class="form-control" rows="8" readonly></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="copyToClipboard">
                    <i class="fas fa-clipboard"></i> Copy to Clipboard
                </button>
                <button type="button" class="btn btn-success" id="downloadEmailList">
                    <i class="fas fa-download"></i> Download as Text File
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Toast Container for Notifications -->
<div id="toastContainer" style="position: fixed; top: 20px; right: 20px; z-index: 1050;"></div>

<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
<script src="../js/newsletterAdmin.js"></script>

</body>
</html>