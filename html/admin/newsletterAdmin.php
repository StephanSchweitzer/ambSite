<?php
global $conn;
session_start();
include '../database/pdo.php';

if (($_SESSION["ambar"] ?? null) != "connected")
{
    header("Location: ../signIn/signIn.php?status=needCredentials");
    die;
}

// Get the last visit timestamp before updating it
try {
    $getLastVisitQuery = "SELECT last_visit FROM admin_last_visit WHERE section = 'newsletter'";
    $stmtLastVisit = $conn->prepare($getLastVisitQuery);
    $stmtLastVisit->execute();
    $lastVisit = null;

    if ($stmtLastVisit->rowCount() > 0) {
        $lastVisit = $stmtLastVisit->fetch(PDO::FETCH_ASSOC)['last_visit'];
    }

    // Get new subscribers since last visit
    $newSubscribers = [];
    if ($lastVisit) {
        $newSubscribersQuery = "SELECT id, email, subscriptionDate, active FROM newsletterEmailList 
                               WHERE subscriptionDate > :lastVisit 
                               ORDER BY subscriptionDate DESC";
        $stmtNewSubscribers = $conn->prepare($newSubscribersQuery);
        $stmtNewSubscribers->bindParam(':lastVisit', $lastVisit, PDO::PARAM_STR);
        $stmtNewSubscribers->execute();
        $newSubscribers = $stmtNewSubscribers->fetchAll(PDO::FETCH_ASSOC);
    }

    // Update the last visit timestamp
    $updateQuery = "INSERT INTO admin_last_visit (section, last_visit) VALUES ('newsletter', CURRENT_TIMESTAMP) 
                   ON DUPLICATE KEY UPDATE last_visit = CURRENT_TIMESTAMP";
    $conn->exec($updateQuery);

} catch (PDOException $e) {
    // Silently fail
    $newSubscribers = [];
}

// Count the new subscribers
$newSubscribersCount = count($newSubscribers);
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
    <link rel="stylesheet" href="newsletterAdmin.css">
    <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
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

            <!-- New Subscribers Section -->
            <?php if ($newSubscribersCount > 0): ?>
                <div class="new-subscribers-container mb-4">
                    <div class="new-subscribers-header">
                        <div class="pulse-icon">
                            <i class="fas fa-bell"></i>
                        </div>
                        <h3>New Subscribers Since Your Last Visit</h3>
                        <span class="badge badge-pill badge-primary"><?php echo $newSubscribersCount; ?></span>
                    </div>

                    <div class="new-subscribers-grid">
                        <?php foreach ($newSubscribers as $subscriber): ?>
                            <div class="new-subscriber-card" data-id="<?php echo $subscriber['id']; ?>">
                                <div class="email-icon">
                                    <i class="fas fa-envelope"></i>
                                </div>
                                <div class="subscriber-details">
                                    <div class="subscriber-email"><?php echo htmlspecialchars($subscriber['email']); ?></div>
                                    <div class="subscriber-time">
                                        <i class="fas fa-clock"></i>
                                        <?php echo date('M j, Y g:i A', strtotime($subscriber['subscriptionDate'])); ?>
                                    </div>
                                    <div class="subscriber-status">
                                        <?php if ($subscriber['active']): ?>
                                            <span class="status-active"><i class="fas fa-check-circle"></i> Active</span>
                                        <?php else: ?>
                                            <span class="status-inactive"><i class="fas fa-times-circle"></i> Inactive</span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                <div class="subscriber-actions">
                                    <button class="btn btn-sm btn-info edit-subscriber" data-id="<?php echo $subscriber['id']; ?>"
                                            data-email="<?php echo htmlspecialchars($subscriber['email']); ?>"
                                            data-active="<?php echo $subscriber['active']; ?>">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger delete-subscriber" data-id="<?php echo $subscriber['id']; ?>"
                                            data-email="<?php echo htmlspecialchars($subscriber['email']); ?>">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Search and Filter Controls -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                        </div>
                        <input type="text" id="searchInput" class="form-control" placeholder="Search emails...">
                    </div>
                </div>
                <div class="col-md-3">
                    <select id="statusFilter" class="form-control">
                        <option value="all">All Subscribers</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                        <?php if ($newSubscribersCount > 0): ?>
                            <option value="new">New Subscribers</option>
                        <?php endif; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <select id="sortFilter" class="form-control">
                        <option value="email_asc">Email (A-Z)</option>
                        <option value="email_desc">Email (Z-A)</option>
                        <option value="date_desc">Newest First</option>
                        <option value="date_asc">Oldest First</option>
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

<!-- Welcome Back Modal for New Subscriptions -->
<?php if ($newSubscribersCount > 0): ?>
    <div class="modal fade" id="welcomeBackModal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Welcome Back!</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body text-center">
                    <div class="welcome-icon mb-3">
                        <i class="fas fa-envelope-open-text"></i>
                    </div>
                    <h4>You have <?php echo $newSubscribersCount; ?> new subscriber<?php echo $newSubscribersCount > 1 ? 's' : ''; ?>!</h4>
                    <p class="text-muted">New sign-ups since your last visit on <?php echo date('F j, Y \a\t g:i A', strtotime($lastVisit)); ?></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-dismiss="modal">View New Subscribers</button>
                </div>
            </div>
        </div>
    </div>
<?php endif; ?>

<!-- Toast Container for Notifications -->
<div id="toastContainer" style="position: fixed; top: 20px; right: 20px; z-index: 1050;"></div>

<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

<script>
    // Store the new subscriber IDs for JavaScript reference
    const newSubscriberIds = <?php echo json_encode(array_column($newSubscribers, 'id')); ?>;

    // Show the welcome back modal on page load if there are new subscribers
    $(document).ready(function() {
        if (newSubscriberIds.length > 0) {
            $('#welcomeBackModal').modal('show');
        }

        // Highlight new subscribers in the main table when it loads
        $(document).on('DOMNodeInserted', '#subscribersList tr', function() {
            const rowId = $(this).data('id');
            if (newSubscriberIds.includes(rowId)) {
                $(this).addClass('new-subscriber-row');
                // Add the "New" badge to the row
                const statusCell = $(this).find('td:nth-child(4)');
                statusCell.append(' <span class="badge badge-pill badge-info ml-2">New</span>');
            }
        });

        // Add event listeners for the new subscriber cards
        $('.edit-subscriber').on('click', function() {
            const id = $(this).data('id');
            const email = $(this).data('email');
            const active = $(this).data('active');

            $('#editId').val(id);
            $('#editEmail').val(email);
            $('#editActive').prop('checked', active == 1);
            $('#editModal').modal('show');
        });

        $('.delete-subscriber').on('click', function() {
            const id = $(this).data('id');
            const email = $(this).data('email');

            $('#deleteId').val(id);
            $('#deleteEmailText').text(email);
            $('#deleteModal').modal('show');
        });

        // Add "New" filter functionality
        $('#statusFilter').on('change', function() {
            const filterValue = $(this).val();
            if (filterValue === 'new') {
                // Hide all rows, then show only new subscribers
                $('#subscribersList tr').hide();
                newSubscriberIds.forEach(id => {
                    $(`#subscribersList tr[data-id="${id}"]`).show();
                });
            } else {
                // Trigger the existing filter functionality
                const searchText = $('#searchInput').val().toLowerCase();
                filterSubscribers(searchText, filterValue);
            }
        });
    });

    // Main app functionality (connect to existing JS)
    // This assumes your existing JS has functions for:
    // - Loading subscribers
    // - Filtering subscribers
    // - Pagination
    // Here we just define a filter function for reference
    function filterSubscribers(searchText, statusFilter) {
        // This would be implemented in your existing JS file
        // and should handle filtering based on search text and status
    }
</script>

<script src="../js/newsletterAdmin.js"></script>

</body>
</html>